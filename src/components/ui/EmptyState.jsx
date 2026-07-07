import { Inbox } from 'lucide-react'

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state__icon">
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div>
        <p className="empty-state__title">{title}</p>
        {description && <p className="empty-state__description">{description}</p>}
      </div>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}
