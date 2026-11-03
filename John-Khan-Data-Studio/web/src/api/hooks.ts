import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiGet } from './client';
import type {
  Avatar,
  AvatarListParams,
  FilterYears,
  Overview,
  Paginated,
  Sign,
  SignListParams,
  Video,
  VideoListParams,
} from './types';

export const queryKeys = {
  overview: ['overview'] as const,
  filters: ['filters'] as const,
  videos: (params: VideoListParams) => ['videos', params] as const,
  signs: (params: SignListParams) => ['signs', params] as const,
  avatars: (params: AvatarListParams) => ['avatars', params] as const,
  randomSign: ['signs', 'random'] as const,
};

export function useOverview() {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: ({ signal }) => apiGet<Overview>('/stats/overview', {}, signal),
    staleTime: 60_000,
  });
}

export function useFilterYears() {
  return useQuery({
    queryKey: queryKeys.filters,
    queryFn: ({ signal }) => apiGet<{ data: { years: FilterYears } }>('/stats/filters', {}, signal),
    staleTime: 300_000,
    select: (response) => response.data.years,
  });
}

export function useVideos(params: VideoListParams) {
  return useQuery({
    queryKey: queryKeys.videos(params),
    queryFn: ({ signal }) => apiGet<Paginated<Video>>('/videos', { ...params }, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSigns(params: SignListParams) {
  return useQuery({
    queryKey: queryKeys.signs(params),
    queryFn: ({ signal }) => apiGet<Paginated<Sign>>('/signs', { ...params }, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useAvatars(params: AvatarListParams) {
  return useQuery({
    queryKey: queryKeys.avatars(params),
    queryFn: ({ signal }) => apiGet<Paginated<Avatar>>('/avatars', { ...params }, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useRandomSign() {
  return useQuery({
    queryKey: queryKeys.randomSign,
    queryFn: ({ signal }) => apiGet<{ data: Sign | null }>('/signs/random', {}, signal),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  });
}
