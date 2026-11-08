import { repo } from '../deps/repository.stub.js';
import { ContributionConfig } from '../config/contribution.config.js';

export interface MemberContributionResult {
  memberId: string;
  name: string;
  percentage: number;
  label: 'Sangat Rajin' | 'Aktif' | 'Cukup' | 'Perlu Perhatian';
  breakdown: {
    documents: number;
    comments: number;
    logs: number;
    tasksDone: number;
  };
  lastActiveAt?: string;
  assignedLoadPercent: number; // Beban tugas yang sedang dipegang
}

export interface GroupContributionResponse {
  groupId: string;
  members: MemberContributionResult[];
  balanceStatus: 'seimbang' | 'agak_timpang' | 'timpang';
  balanceScore: number; // 0-100
}

export class ContributionService {
  /**
   * Menghitung rasio kontribusi tiap anggota secara deterministik
   */
  public static async calculateGroupContribution(groupId: string): Promise<GroupContributionResponse> {
    const group = await repo.getGroup(groupId);
    if (!group) {
      throw new Error(`Group dengan ID ${groupId} tidak ditemukan`);
    }

    const tasks = await repo.getTasks(groupId);
    const activities = await repo.getActivity(groupId);
    const now = new Date().toISOString();

    const memberStatsMap = new Map<
      string,
      {
        documents: number;
        comments: number;
        logs: number;
        tasksDone: number;
        tasksDoneWeight: number;
        assignedWeight: number;
        lastActiveAt?: string;
      }
    >();

    // Inisialisasi setiap anggota kelompok
    for (const m of group.members) {
      memberStatsMap.set(m.id, {
        documents: 0,
        comments: 0,
        logs: 0,
        tasksDone: 0,
        tasksDoneWeight: 0,
        assignedWeight: 0,
      });
    }

    // Akumulasi tugas
    let totalAssignedWeight = 0;
    for (const task of tasks) {
      if (!task.assigneeId || !memberStatsMap.has(task.assigneeId)) continue;
      const stat = memberStatsMap.get(task.assigneeId)!;
      stat.assignedWeight += task.weight || 0;
      totalAssignedWeight += task.weight || 0;

      if (task.status === 'done') {
        stat.tasksDone += 1;
        stat.tasksDoneWeight += task.weight || 20;
        if (task.doneAt) {
          if (!stat.lastActiveAt || new Date(task.doneAt) > new Date(stat.lastActiveAt)) {
            stat.lastActiveAt = task.doneAt;
          }
        }
      }
    }

    // Akumulasi aktivitas (dokumen, log, komentar)
    for (const act of activities) {
      if (!memberStatsMap.has(act.memberId)) continue;
      const stat = memberStatsMap.get(act.memberId)!;

      if (act.type === 'document' || act.type === 'upload') {
        stat.documents += 1;
      } else if (act.type === 'comment') {
        stat.comments += 1;
      } else if (act.type === 'log') {
        stat.logs += 1;
      }

      if (!stat.lastActiveAt || new Date(act.at) > new Date(stat.lastActiveAt)) {
        stat.lastActiveAt = act.at;
      }
    }

    // Hitung Raw Score matematis
    const rawScores: { memberId: string; raw: number }[] = [];
    let totalRaw = 0;

    for (const member of group.members) {
      const stat = memberStatsMap.get(member.id)!;
      const score =
        stat.tasksDoneWeight * ContributionConfig.weights.taskCompletedMultiplier +
        stat.documents * ContributionConfig.weights.documentUpload +
        stat.logs * ContributionConfig.weights.activityLog +
        stat.comments * ContributionConfig.weights.comment;

      rawScores.push({ memberId: member.id, raw: score });
      totalRaw += score;
    }

    // Hitung persentase dinormalisasi ke 100%
    const membersResult: MemberContributionResult[] = [];
    const memberCount = group.members.length;

    let accumulatedPercent = 0;
    group.members.forEach((member, index) => {
      const stat = memberStatsMap.get(member.id)!;
      const raw = rawScores.find((r) => r.memberId === member.id)?.raw || 0;

      let pct: number;
      if (totalRaw === 0) {
        pct = Math.round(100 / memberCount);
      } else if (index === memberCount - 1) {
        // Anggota terakhir menampung pembulatan agar pas 100%
        pct = Math.max(0, 100 - accumulatedPercent);
      } else {
        pct = Math.round((raw / totalRaw) * 100);
        accumulatedPercent += pct;
      }

      // Label kontribusi
      let label: MemberContributionResult['label'] = 'Cukup';
      if (pct >= 35) {
        label = 'Sangat Rajin';
      } else if (pct >= 25) {
        label = 'Aktif';
      } else if (pct >= 15) {
        label = 'Cukup';
      } else {
        label = 'Perlu Perhatian';
      }

      // Hitung assigned load percent (porsi beban tugas yang saat ini dipegang)
      const assignedPct = totalAssignedWeight > 0 ? Math.round((stat.assignedWeight / totalAssignedWeight) * 100) : Math.round(100 / memberCount);

      membersResult.push({
        memberId: member.id,
        name: member.name,
        percentage: pct,
        label,
        breakdown: {
          documents: stat.documents,
          comments: stat.comments,
          logs: stat.logs,
          tasksDone: stat.tasksDone,
        },
        lastActiveAt: stat.lastActiveAt,
        assignedLoadPercent: assignedPct,
      });

      // Simpan snapshot ke database stub AI
      repo.saveSnapshot({
        groupId,
        memberId: member.id,
        percentage: pct,
        breakdown: {
          documents: stat.documents,
          comments: stat.comments,
          logs: stat.logs,
          tasksDone: stat.tasksDone,
        },
        computedAt: now,
      });
    });

    // Hitung balance status & score (0 - 100)
    const percentages = membersResult.map((m) => m.percentage);
    const maxPct = Math.max(...percentages);
    const minPct = Math.min(...percentages);
    const spread = maxPct - minPct;

    let balanceStatus: 'seimbang' | 'agak_timpang' | 'timpang';
    let balanceScore: number;

    if (spread <= 10) {
      balanceStatus = 'seimbang';
      balanceScore = Math.max(90, 100 - spread);
    } else if (spread <= 25) {
      balanceStatus = 'agak_timpang';
      balanceScore = Math.max(70, 95 - spread);
    } else {
      balanceStatus = 'timpang';
      balanceScore = Math.max(30, 80 - spread);
    }

    return {
      groupId,
      members: membersResult,
      balanceStatus,
      balanceScore,
    };
  }
}
