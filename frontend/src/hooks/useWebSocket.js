import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useWebSocket = () => {
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
      setConnected(false);
    });

    socket.on('stats', (data) => {
      setStats(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { stats, connected };
};