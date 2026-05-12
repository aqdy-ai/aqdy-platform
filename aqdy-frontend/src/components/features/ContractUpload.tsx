import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileText, X } from "lucide-react"

export default function ContractUpload() {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleRemoveFile = (): void => {
    setFile(null)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-none shadow-sm bg-slate-50/50 dark:bg-zinc-900/50">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("common.upload")}</CardTitle>
        <CardDescription>
          {t("upload_description", "Supported formats: PDF, DOCX (Max 10MB)")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-6">
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-12 transition-colors hover:bg-slate-100/50 dark:hover:bg-zinc-800/50 cursor-pointer relative"
          >
            <Input
              id="contract-file"
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept=".pdf,.docx"
            />

            {!file ? (
              <>
                <UploadCloud className="w-12 h-12 mb-4 text-slate-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                  {t("drag_drop", "Click or drag to upload contract")}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-zinc-700">
                <FileText className="text-blue-500 w-5 h-5" />
                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={handleRemoveFile}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <Label htmlFor="contract-file" className="sr-only">
            {t("common.upload")}
          </Label>

          <Button
            disabled={!file}
            className="w-full h-12 text-lg font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-zinc-900 transition-all"
          >
            {t("analyze_now", "Analyze Contract")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
