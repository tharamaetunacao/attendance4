import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Box, Paper, Typography, Alert, CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';
import './calendar.css';

// Philippine Holidays for 2026 (you can update this annually or fetch from an API)
const philippineHolidays2026 = [
  { title: "New Year's Day", date: '2026-01-01', color: '#d32f2f' },
  { title: 'Chinese New Year', date: '2026-02-17', color: '#d32f2f' },
  { title: 'EDSA People Power Revolution Anniversary', date: '2026-02-25', color: '#d32f2f' },
  { title: 'Araw ng Kagitingan (Day of Valor)', date: '2026-04-09', color: '#d32f2f' },
  { title: 'Maundy Thursday', date: '2026-04-02', color: '#d32f2f' },
  { title: 'Good Friday', date: '2026-04-03', color: '#d32f2f' },
  { title: 'Black Saturday', date: '2026-04-04', color: '#d32f2f' },
  { title: 'Labor Day', date: '2026-05-01', color: '#d32f2f' },
  { title: 'Independence Day', date: '2026-06-12', color: '#d32f2f' },
  { title: 'Eid al-Adha (Feast of Sacrifice)', date: '2026-06-16', color: '#d32f2f' },
  { title: 'Ninoy Aquino Day', date: '2026-08-21', color: '#d32f2f' },
  { title: 'National Heroes Day', date: '2026-08-31', color: '#d32f2f' },
  { title: 'All Saints Day', date: '2026-11-01', color: '#d32f2f' },
  { title: 'All Souls Day', date: '2026-11-02', color: '#d32f2f' },
  { title: 'Bonifacio Day', date: '2026-11-30', color: '#d32f2f' },
  { title: 'Feast of the Immaculate Conception', date: '2026-12-08', color: '#d32f2f' },
  { title: 'Christmas Eve', date: '2026-12-24', color: '#d32f2f' },
  { title: 'Christmas Day', date: '2026-12-25', color: '#d32f2f' },
  { title: 'Rizal Day', date: '2026-12-30', color: '#d32f2f' },
  { title: "New Year's Eve", date: '2026-12-31', color: '#d32f2f' },
];

const GoogleCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Combine Philippine holidays with any other events
    setEvents([...philippineHolidays2026]);
    setLoading(false);
  }, []);

  const handleDateClick = (arg) => {
    toast.success(`Date clicked: ${arg.dateStr}`);
  };

  const handleEventClick = (info) => {
    toast.info(`${info.event.title}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Calendar with Philippine Holidays
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ '& .fc': { fontFamily: 'inherit' } }}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          editable={false}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          height="auto"
          eventDisplay="block"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: 'short'
          }}
          eventContent={(eventInfo) => {
            return (
              <Box
                sx={{
                  p: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.85rem',
                }}
              >
                <strong>{eventInfo.event.title}</strong>
              </Box>
            );
          }}
          dayCellClassNames={(arg) => {
            // Highlight holidays
            const isHoliday = philippineHolidays2026.some(
              holiday => holiday.date === arg.date.toISOString().split('T')[0]
            );
            return isHoliday ? 'holiday-cell' : '';
          }}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Legend:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                bgcolor: '#d32f2f',
                borderRadius: 1,
              }}
            />
            <Typography variant="body2">Philippine Holidays</Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default GoogleCalendar;
