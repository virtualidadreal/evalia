import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PricingCardProps {
  name: string
  price: number
  description: string
  features: readonly string[]
  popular?: boolean
  cta?: string
  onSelect: () => void
}

export function PricingCard({
  name,
  price,
  description,
  features,
  popular = false,
  cta = 'Empezar gratis',
  onSelect,
}: PricingCardProps) {
  return (
    <Card
      className={cn(
        'relative flex flex-col transition-smooth',
        popular
          ? 'scale-105 border-primary shadow-xl'
          : 'hover:shadow-card-hover hover:-translate-y-0.5'
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="px-3 py-1 text-xs font-semibold">
            Más popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-0">
        <CardTitle className="text-lg font-semibold">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-foreground">
            {price}€
          </span>
          <span className="text-muted-foreground text-sm">/mes</span>
        </div>

        <ul className="flex flex-1 flex-col gap-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={popular ? 'premium' : 'outline'}
          size="lg"
          className="w-full"
          onClick={onSelect}
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  )
}
