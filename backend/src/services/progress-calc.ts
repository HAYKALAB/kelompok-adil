export interface ProgressTaskInput {
  id: string;
  assigneeId: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | string;
  weight: number;
  progress: number;
  deadline: Date | string | null;
}

export interface ProgressMemberInput {
  id: string;
  name: string;
}

export interface MemberProgressResult {
  participantId: string;
  name: string;
  taskCount: number;
  progressPercent: number | null;
}

export interface GroupProgressResult {
  groupId: string;
  name: string;
  progressPercent: number;
  statusCounts: {
    todo: number;
    inProgress: number;
    done: number;
  };
  nearestDeadline: string | null;
  members: MemberProgressResult[];
}

/**
 * Menghitung rata-rata progres berbobot: sum(weight * progress) / sum(weight).
 * Mengembalikan 0 jika daftar tugas kosong atau total bobot <= 0.
 */
export function calculateWeightedProgress(
  tasks: Array<{ weight: number; progress: number }>
): number {
  if (tasks.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const t of tasks) {
    const w = Number(t.weight) || 0;
    const p = Math.max(0, Math.min(100, Number(t.progress) || 0));
    if (w > 0) {
      weightedSum += w * p;
      totalWeight += w;
    }
  }

  if (totalWeight <= 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Menghitung ringkasan progres untuk satu kelompok beserta tiap anggotanya.
 */
export function computeGroupProgressSummary(
  group: { id: string; name: string },
  tasks: ProgressTaskInput[],
  members: ProgressMemberInput[]
): GroupProgressResult {
  const statusCounts = {
    todo: 0,
    inProgress: 0,
    done: 0,
  };

  let nearestTime: number | null = null;
  let nearestIso: string | null = null;

  for (const t of tasks) {
    if (t.status === 'DONE') {
      statusCounts.done += 1;
    } else if (t.status === 'IN_PROGRESS') {
      statusCounts.inProgress += 1;
    } else {
      statusCounts.todo += 1;
    }

    if (t.status !== 'DONE' && t.deadline) {
      const d = t.deadline instanceof Date ? t.deadline : new Date(t.deadline);
      const time = d.getTime();
      if (!Number.isNaN(time) && (nearestTime === null || time < nearestTime)) {
        nearestTime = time;
        nearestIso = d.toISOString();
      }
    }
  }

  const memberResults: MemberProgressResult[] = members.map((m) => {
    const memberTasks = tasks.filter((t) => t.assigneeId === m.id);
    return {
      participantId: m.id,
      name: m.name,
      taskCount: memberTasks.length,
      progressPercent: memberTasks.length === 0 ? null : calculateWeightedProgress(memberTasks),
    };
  });

  return {
    groupId: group.id,
    name: group.name,
    progressPercent: calculateWeightedProgress(tasks),
    statusCounts,
    nearestDeadline: nearestIso,
    members: memberResults,
  };
}
