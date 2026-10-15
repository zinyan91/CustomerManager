export interface ModelPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  [khac: string]: unknown;
}

export interface Content {
  role: 'user' | 'model';
  parts: ModelPart[];
}

export type TurnChunk = { text: string } | { parts: ModelPart[] };
export type OpenTurn = (contents: Content[], coCongCu: boolean) => AsyncIterable<TurnChunk>;
export type ToolTable = Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>>;

export const SO_LUOT_CONG_CU_TOI_DA = 2;

async function chayCongCu(tools: ToolTable, name: string, args: Record<string, unknown>): Promise<ModelPart> {
  const tool = tools[name];
  if (!tool) return { functionResponse: { name, response: { loi: `Không có công cụ ${name}` } } };
  try {
    return { functionResponse: { name, response: { ketQua: await tool(args) } } };
  } catch (err) {
    return { functionResponse: { name, response: { loi: err instanceof Error ? err.message : String(err) } } };
  }
}

export async function* runToolLoop(
  openTurn: OpenTurn,
  contents: Content[],
  tools: ToolTable,
  onToolUse?: () => void
): AsyncGenerator<string> {
  let lichSu = contents;
  for (let luot = 0; ; luot++) {
    const coCongCu = luot < SO_LUOT_CONG_CU_TOI_DA;
    let parts: ModelPart[] = [];
    for await (const chunk of openTurn(lichSu, coCongCu)) {
      if ('text' in chunk) yield chunk.text;
      else parts = chunk.parts;
    }
    const cacLenhGoi = coCongCu ? parts.filter((p) => p.functionCall) : [];
    if (cacLenhGoi.length === 0) return;
    onToolUse?.();
    const ketQua = await Promise.all(
      cacLenhGoi.map((p) => chayCongCu(tools, p.functionCall!.name, p.functionCall!.args ?? {}))
    );
    lichSu = [...lichSu, { role: 'model', parts }, { role: 'user', parts: ketQua }];
  }
}
