export type OpType = "k" | "d" | "i";

export interface DiffOp {
  t: OpType;
  v: string;
}

function normalize(line: string): string {
  return line.trimEnd().replace(/[,;:]+$/, "");
}

export function diffLines(before: string, after: string, fuzzy = false): DiffOp[] {
  const a = before.split("\n"),
    b = after.split("\n");
  const eq = fuzzy
    ? (x: string, y: string) => normalize(x) === normalize(y)
    : (x: string, y: string) => x === y;

  const N = a.length,
    M = b.length;
  const dp = Array.from({ length: N + 1 }, () => new Uint16Array(M + 1));
  for (let i = 1; i <= N; i++)
    for (let j = 1; j <= M; j++)
      dp[i][j] = eq(a[i - 1], b[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);

  const ops: DiffOp[] = [];
  let i = N,
    j = M;
  while (i > 0 && j > 0) {
    if (eq(a[i - 1], b[j - 1])) {
      --i;
      ops.push({ t: "k", v: b[--j] });
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
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
