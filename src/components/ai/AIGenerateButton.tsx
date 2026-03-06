import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIGenerateButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  label?: string
  className?: string
}

export function AIGenerateButton({
  onClick,
  loading = false,
  disabled = false,
  label = 'Generar con IA',
  className,
}: AIGenerateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'bg-ai text-ai-foreground hover:bg-ai/90 shadow-sm',
        !loading && !disabled && 'animate-pulse-glow',
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {label}
    </Button>
  )
}
