import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logCrash } from './crashLogger';

const onQueryError = (error, query) => {
	logCrash(error, {
		page: window.location.pathname.replace("/", "") || "Home1",
		action: `query:${query?.queryKey?.[0] || "unknown"}`,
		severity: "warning",
	});
};

const onMutationError = (error, _vars, _ctx, mutation) => {
	logCrash(error, {
		page: window.location.pathname.replace("/", "") || "Home1",
		action: `mutation:${mutation?.options?.mutationKey?.[0] || "unknown"}`,
		severity: "error",
	});
};

export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({ onError: onQueryError }),
	mutationCache: new MutationCache({ onError: onMutationError }),
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