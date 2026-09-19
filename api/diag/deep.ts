export default function handler(_req: unknown, res: { end: (body: string) => void }) {
  res.end("deep-ok");
}
