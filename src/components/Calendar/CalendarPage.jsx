import { Container, Box, Typography } from '@mui/material';
import GoogleCalendar from './GoogleCalendar';

const CalendarPage = () => {
  // Get Google Calendar credentials from environment variables (optional)
  const googleApiKey = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;
  const googleCalendarId = import.meta.env.VITE_GOOGLE_CALENDAR_ID;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Company Calendar
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View company events and Philippine holidays
        </Typography>
      </Box>

      <GoogleCalendar 
        googleApiKey={googleApiKey}
        googleCalendarId={googleCalendarId}
      />
    </Container>
  );
};

export default CalendarPage;
