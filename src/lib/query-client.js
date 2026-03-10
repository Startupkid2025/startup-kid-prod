import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Cache data for 2 minutes before considering it stale
			staleTime: 2 * 60 * 1000,
			// Keep unused cache for 5 minutes before garbage collection
			gcTime: 5 * 60 * 1000,
		},
	},
});