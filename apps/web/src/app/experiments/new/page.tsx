import { ImportWizard } from "./ImportWizard";

export const dynamic = "force-dynamic";

export default function NewExperimentPage() {
  return (
    <div className="px-6 py-10 max-w-6xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">実験データを取り込む</h1>
        <p className="text-sm opacity-80 mt-1">
          CSV / TSV / JSON / TXT をアップロードし、カラム型を確認して登録します。
        </p>
      </header>
      <ImportWizard />
    </div>
  );
}
