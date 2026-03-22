import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export const useSocket = (events: { [key: string]: (data: any) => void }) => {
    const socketRef = useRef<Socket | null>(null);
    const eventsRef = useRef(events);

    // Keep eventsRef updated with the latest handlers
    useEffect(() => {
        eventsRef.current = events;
    }, [events]);

    useEffect(() => {
        // Initialize socket connection
        const socket = io(SOCKET_URL, {
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('📡 Connected to WebSocket server');
        });

        socket.on('disconnect', () => {
            console.log('📡 Disconnected from WebSocket server');
        });

        // Register event listeners that call the LATEST handler from ref
        Object.keys(events).forEach((event) => {
            socket.on(event, (data) => {
                if (eventsRef.current[event]) {
                    eventsRef.current[event](data);
                }
            });
        });

        // Cleanup on unmount
        return () => {
            socket.disconnect();
        };
    }, []); // Connection remains stable

    return socketRef.current;
};
