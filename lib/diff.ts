export type OpType = "k" | "d" | "i";

export interface DiffOp {
  t: OpType;
  v: string;
}

function normalize(line: string): string {
  return line.trimEnd().replace(/[,;:]+$/, "");
}

function getMatchKind(beforeLine: string, afterLine: string, fuzzy: boolean) {
  if (beforeLine === afterLine) return 2;
  if (fuzzy && normalize(beforeLine) === normalize(afterLine)) return 1;
  return 0;
}

function isBetterCandidate(
  lengthA: number,
  exactA: number,
  lengthB: number,
  exactB: number
) {
  return lengthA > lengthB || (lengthA === lengthB && exactA > exactB);
}

export function diffLines(before: string, after: string, fuzzy = false): DiffOp[] {
  const a = before.split("\n");
  const b = after.split("\n");

  const N = a.length;
  const M = b.length;
  const lengths = Array.from({ length: N + 1 }, () => new Uint16Array(M + 1));
  const exactMatches = Array.from(
    { length: N + 1 },
    () => new Uint16Array(M + 1)
  );

  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      let bestLength = lengths[i - 1][j];
      let bestExactMatches = exactMatches[i - 1][j];

      if (
        isBetterCandidate(
          lengths[i][j - 1],
          exactMatches[i][j - 1],
          bestLength,
          bestExactMatches
        )
      ) {
        bestLength = lengths[i][j - 1];
        bestExactMatches = exactMatches[i][j - 1];
      }

      const matchKind = getMatchKind(a[i - 1], b[j - 1], fuzzy);
      if (matchKind > 0) {
        const candidateLength = lengths[i - 1][j - 1] + 1;
        const candidateExactMatches =
          exactMatches[i - 1][j - 1] + (matchKind === 2 ? 1 : 0);

        if (
          isBetterCandidate(
            candidateLength,
            candidateExactMatches,
            bestLength,
            bestExactMatches
          )
        ) {
          bestLength = candidateLength;
          bestExactMatches = candidateExactMatches;
        }
      }

      lengths[i][j] = bestLength;
      exactMatches[i][j] = bestExactMatches;
    }
  }

  const ops: DiffOp[] = [];
  let i = N;
  let j = M;

  const hasSameScore = (
    currentI: number,
    currentJ: number,
    nextI: number,
    nextJ: number
  ) =>
    lengths[currentI][currentJ] === lengths[nextI][nextJ] &&
    exactMatches[currentI][currentJ] === exactMatches[nextI][nextJ];

  while (i > 0 && j > 0) {
    const matchKind = getMatchKind(a[i - 1], b[j - 1], fuzzy);

    if (matchKind > 0) {
      const candidateLength = lengths[i - 1][j - 1] + 1;
      const candidateExactMatches =
        exactMatches[i - 1][j - 1] + (matchKind === 2 ? 1 : 0);

      // If we can keep the same score by skipping the current after line,
      // prefer that so repeated closing tokens stay anchored to the earliest
      // exact match instead of drifting downward.
      if (hasSameScore(i, j, i, j - 1)) {
        ops.push({ t: "i", v: b[--j] });
        continue;
      }

      if (hasSameScore(i, j, i - 1, j)) {
        ops.push({ t: "d", v: a[--i] });
        continue;
      }

      if (
        lengths[i][j] === candidateLength &&
        exactMatches[i][j] === candidateExactMatches
      ) {
        --i;
        ops.push({ t: "k", v: b[--j] });
        continue;
      }
    }

    if (hasSameScore(i, j, i - 1, j)) {
      ops.push({ t: "d", v: a[--i] });
    } else {
      ops.push({ t: "i", v: b[--j] });
    }
  }
  while (i > 0) ops.push({ t: "d", v: a[--i] });
  while (j > 0) ops.push({ t: "i", v: b[--j] });
  ops.reverse();
  return ops;
}
