import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import ticketRoutes from './routes/ticket.routes';

dotenv.config();

connectDB();

const app: Application = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);


app.use(express.json());


app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Activity Tracker API is running',
    timestamp: new Date().toISOString(),
  });
})

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Activity Tracker API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tickets', ticketRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    message: 'Something went wrong on the server.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = parseInt(process.env.PORT || '5000', 10);

// app.listen(PORT, () => {
//   console.log(`\n Server running on http://localhost:${PORT}`);
//   console.log(` Health check: http://localhost:${PORT}/health`);
//   console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
// });
 
export default app;
