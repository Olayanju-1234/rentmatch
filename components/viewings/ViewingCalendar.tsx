"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

interface CalendarViewing {
  _id: string
  requestedDate: string
  requestedTime: string
  status: string
  propertyId?: { title?: string; location?: { city?: string } }
  landlordId?: { name?: string }
}

interface ViewingCalendarProps {
  viewings: CalendarViewing[]
  onViewingClick: (viewingId: string) => void
}

const STATUS_DOT: Record<string, string> = {
  pending:   "bg-yellow-400",
  confirmed: "bg-green-500",
  completed: "bg-blue-500",
  cancelled: "bg-red-400",
}

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border border-yellow-200",
  confirmed: "bg-green-50 text-green-700 border border-green-200",
  completed: "bg-gray-50 text-gray-600 border border-gray-200",
  cancelled: "bg-red-50 text-red-600 border border-red-200",
}

export function ViewingCalendar({ viewings, onViewingClick }: ViewingCalendarProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" })

  // Map viewings to day-of-month
  const byDay: Record<number, CalendarViewing[]> = {}
  for (const v of viewings) {
    if (!v.requestedDate) continue
    const d = new Date(v.requestedDate)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(v)
    }
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const today = now.getDate()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const events = day ? (byDay[day] ?? []) : []
          const isToday = isCurrentMonth && day === today
          return (
            <div
              key={i}
              className={`min-h-[72px] p-1.5 border-b border-r border-gray-50 last:border-r-0 ${!day ? "bg-gray-50/50" : ""}`}
            >
              {day && (
                <>
                  <p className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-gray-900 text-white" : "text-gray-600"}`}>
                    {day}
                  </p>
                  <div className="space-y-0.5">
                    {events.slice(0, 2).map((v) => (
                      <button
                        key={v._id}
                        onClick={() => onViewingClick(v._id)}
                        className="w-full text-left"
                      >
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate hover:opacity-80 transition-opacity ${STATUS_BADGE[v.status] || "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[v.status] || "bg-gray-400"}`} />
                          <span className="truncate">{v.propertyId?.title ?? "Viewing"}</span>
                        </div>
                      </button>
                    ))}
                    {events.length > 2 && (
                      <p className="text-[10px] text-gray-400 pl-1">+{events.length - 2} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-100">
        {Object.entries(STATUS_DOT).map(([status, cls]) => (
          <span key={status} className="flex items-center gap-1.5 text-[11px] text-gray-500 capitalize">
            <span className={`w-2 h-2 rounded-full ${cls}`} />
            {status}
          </span>
        ))}
      </div>
    </div>
  )
}
