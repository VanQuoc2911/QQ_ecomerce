import { useEffect, useState } from "react";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// GET + Fetch API hook
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: unknown[] = []
): UseApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Có lỗi xảy ra";
      setState({ data: null, loading: false, error: message });
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return {
    ...state,
    refetch: fetchData,
  };
}

// POST / PUT / DELETE mutation hook
export function useApiMutation<T, P = Record<string, unknown>>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = async (apiCall: (params: P) => Promise<T>, params: P) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const result = await apiCall(params);
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Có lỗi xảy ra";
      setState({ data: null, loading: false, error: message });
      throw err;
    }
  };

  return {
    ...state,
    mutate,
  };
}
