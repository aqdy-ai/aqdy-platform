import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { UploadCloud, FileText, X } from 'lucide-react'

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
    <Card className="mx-auto w-full max-w-2xl border-none bg-slate-50/50 shadow-sm dark:bg-zinc-900/50">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {t('common.upload')}
        </CardTitle>
        <CardDescription>
          {t('upload_description', 'Supported formats: PDF, DOCX (Max 10MB)')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-6">
          <div className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-12 transition-colors hover:bg-slate-100/50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
            <Input
              id="contract-file"
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
              accept=".pdf,.docx"
            />

            {!file ? (
              <>
                <UploadCloud className="mb-4 h-12 w-12 text-slate-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                  {t('drag_drop', 'Click or drag to upload contract')}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="max-w-[200px] truncate text-sm font-medium">
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Label htmlFor="contract-file" className="sr-only">
            {t('common.upload')}
          </Label>

          <Button
            disabled={!file}
            className="h-12 w-full bg-zinc-900 text-lg font-semibold transition-all hover:bg-zinc-800 dark:bg-slate-100 dark:text-zinc-900 dark:hover:bg-slate-200"
          >
            {t('analyze_now', 'Analyze Contract')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
