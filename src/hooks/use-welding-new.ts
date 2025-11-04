import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface WeldingItem {
    id: number;
    code: string;
    orderNumber: string;
    orderQuantity: number;
    sentAt: string;
}

export function useWeldingItems() {
    const [items, setItems] = useState<WeldingItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        carregarItens();
    }, []);

    async function carregarItens() {
        try {
            setLoading(true);
            const response = await api.get('/api/welding');
            setItems(response.data.data);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Erro desconhecido');
            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function carregarItensPorData(startDate: string, endDate: string) {
        try {
            setLoading(true);
            const response = await api.get('/api/welding/by-date', {
                params: { startDate, endDate }
            });
            setItems(response.data.data);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Erro desconhecido');
            throw error;
        } finally {
            setLoading(false);
        }
    }

    async function deleteItem(id: number) {
        try {
            await api.delete(`/api/welding/${id}`);
            setItems(items => items.filter(item => item.id !== id));
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Erro desconhecido');
            throw error;
        }
    }

    return {
        items,
        loading,
        error,
        carregarItens,
        carregarItensPorData,
        deleteItem
    };
}