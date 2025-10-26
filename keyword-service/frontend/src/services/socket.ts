import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io('http://localhost:5000', {
        transports: ['websocket'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToProject(projectId: number, callback: (data: any) => void) {
    if (!this.socket) this.connect();

    this.socket?.emit('subscribe_project', projectId);
    this.socket?.on(`project_${projectId}_update`, callback);
  }

  unsubscribeFromProject(projectId: number) {
    if (!this.socket) return;

    this.socket.emit('unsubscribe_project', projectId);
    this.socket.off(`project_${projectId}_update`);
  }

  subscribeToJob(jobId: string, callback: (data: any) => void) {
    if (!this.socket) this.connect();

    this.socket?.emit('subscribe_job', jobId);
    this.socket?.on(`job_${jobId}_update`, callback);
  }

  unsubscribeFromJob(jobId: string) {
    if (!this.socket) return;

    this.socket.emit('unsubscribe_job', jobId);
    this.socket.off(`job_${jobId}_update`);
  }

  getSocket() {
    return this.socket || this.connect();
  }
}

export default new SocketService();
