import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// Thin FullCalendar wrapper with the app's defaults (week time-grid, business hours, blue/purple theme in index.css)
export default function Calendar({ events, onEventClick, onSelect, selectable = false, height = 640, initialView = 'timeGridWeek', ...rest }) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView={initialView}
      headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
      events={events}
      eventClick={(info) => onEventClick?.(info.event)}
      selectable={selectable}
      select={(info) => onSelect?.(info)}
      selectMirror
      nowIndicator
      allDaySlot={false}
      slotMinTime="07:00:00"
      slotMaxTime="21:00:00"
      slotDuration="00:15:00"
      slotLabelInterval="01:00"
      expandRows
      height={height}
      eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
      {...rest}
    />
  );
}
