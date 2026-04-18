import Link from "next/link";
import { ImportWizard } from "./ImportWizard";

export const dynamic = "force-dynamic";

export default function NewExperimentPage() {
  return (
    <div className="px-6 py-10 max-w-6xl mx-auto w-full relative z-10">
      <header className="mb-8">
        <div className="text-xs text-white/30 mb-2">
          <Link href="/" className="hover:text-white/60 transition-colors">
            実験一覧
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white/50">新規取込</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">実験データを取り込む</h1>
        <p className="text-sm text-white/40 mt-1.5">
          CSV / TSV / JSON / TXT をアップロードし、カラム型を確認して登録します。
        </p>
      </header>
      <ImportWizard />
    </div>
  );
}
