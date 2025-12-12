'use client'



import { Button, ProgressBar } from '@/components/ui'

import { formatDate } from '@/lib/utils'



interface CalendarEvent {

  id: string

  type: 'brewing' | 'fermentation' | 'conditioning' | 'packaging' | 'maintenance'

  title: string

  batchId?: string

  batchNumber?: string

  recipe?: string

  tankId: string

  tankName: string

  startDate: Date

  endDate: Date

  status: 'scheduled' | 'active' | 'completed'

  progress?: number

  temperature?: number

  notes?: string

}



interface EventDetailModalProps {

  event: CalendarEvent | null

  isOpen: boolean

  onClose: () => void

  onEdit?: () => void

  onDelete?: () => void

}



const getEventIcon = (type: CalendarEvent['type']): string => {

  if (type === 'brewing') return '🍺'

  if (type === 'fermentation') return '🧪'

  if (type === 'conditioning') return '🔵'

  if (type === 'packaging') return '🎁'

  return '🔧'

}



const getEventTitle = (type: CalendarEvent['type']): string => {

  if (type === 'brewing') return 'ხარშვა'

  if (type === 'fermentation') return 'ფერმენტაცია'

  if (type === 'conditioning') return 'კონდიციონირება'

  if (type === 'packaging') return 'შეფუთვა'

  return 'მოვლა'

}



const getStatusLabel = (status: CalendarEvent['status']): string => {

  if (status === 'active') return '🟢 აქტიური'

  if (status === 'completed') return '✅ დასრულებული'

  return '📅 დაგეგმილი'

}



const calculateDuration = (start: Date, end: Date): number => {

  const diffTime = Math.abs(end.getTime() - start.getTime())

  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))

}



export function EventDetailModal({ event, isOpen, onClose, onEdit, onDelete }: EventDetailModalProps) {

  if (!isOpen || !event) return null



  const icon = getEventIcon(event.type)

  const title = getEventTitle(event.type)

  const duration = calculateDuration(event.startDate, event.endDate)

  const statusLabel = getStatusLabel(event.status)



  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>

      <div className="bg-bg-primary border border-border rounded-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>

        <div className="p-6 border-b border-border">

          <div className="flex items-center gap-3">

            <span className="text-2xl">{icon}</span>

            <h2 className="text-xl font-semibold">{title}</h2>

          </div>

        </div>



        <div className="p-6 space-y-4">

          {/* Event Details */}

          {event.batchNumber && (

            <div>

              <span className="text-sm text-text-muted">პარტია:</span>

              <span className="ml-2 font-medium text-copper-light">{event.batchNumber}</span>

            </div>

          )}



          {event.recipe && (

            <div>

              <span className="text-sm text-text-muted">რეცეპტი:</span>

              <span className="ml-2 font-medium text-text-primary">{event.recipe}</span>

            </div>

          )}



          <div>

            <span className="text-sm text-text-muted">ტანკი:</span>

            <span className="ml-2 font-medium text-text-primary">{event.tankName}</span>

          </div>



          <div>

            <span className="text-sm text-text-muted">დაწყება:</span>

            <span className="ml-2 font-medium text-text-primary">{formatDate(event.startDate)}</span>

          </div>



          <div>

            <span className="text-sm text-text-muted">დასრულება:</span>

            <span className="ml-2 font-medium text-text-primary">{formatDate(event.endDate)}</span>

          </div>



          <div>

            <span className="text-sm text-text-muted">ხანგრძლივობა:</span>

            <span className="ml-2 font-medium text-text-primary">{duration} დღე</span>

          </div>



          <div>

            <span className="text-sm text-text-muted">სტატუსი:</span>

            <span className="ml-2 font-medium">{statusLabel}</span>

          </div>



          {event.temperature !== undefined && (

            <div>

              <span className="text-sm text-text-muted">ტემპერატურა:</span>

              <span className="ml-2 font-medium text-text-primary">{event.temperature}°C</span>

            </div>

          )}



          {event.progress !== undefined && (

            <div>

              <span className="text-sm text-text-muted mb-2 block">პროგრესი:</span>

              <ProgressBar value={event.progress} color="copper" />

              <span className="text-xs text-text-muted mt-1">{event.progress}%</span>

            </div>

          )}



          {event.notes && (

            <div>

              <span className="text-sm text-text-muted mb-2 block">შენიშვნა:</span>

              <p className="text-sm text-text-primary bg-bg-card p-3 rounded-lg">{event.notes}</p>

            </div>

          )}

        </div>



        {/* Footer */}

        <div className="p-6 border-t border-border flex justify-end gap-2">

          <Button variant="outline" onClick={onClose}>

            დახურვა

          </Button>

          {onEdit && (

            <Button variant="outline" onClick={onEdit}>

              რედაქტირება

            </Button>

          )}

          {onDelete && (

            <Button variant="outline" onClick={onDelete} className="text-red-400 hover:text-red-300">

              წაშლა

            </Button>

          )}

        </div>

      </div>

    </div>

  )

}

