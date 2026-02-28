import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Passage, TestResult } from "../backend.d.ts";
import { useActor } from "./useActor";

export function usePassages() {
  const { actor, isFetching } = useActor();
  return useQuery<Passage[]>({
    queryKey: ["passages"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPassages();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTestResults() {
  const { actor, isFetching } = useActor();
  return useQuery<TestResult[]>({
    queryKey: ["testResults"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTestResults();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCheckSession(
  mobile: string,
  sessionId: string,
  enabled: boolean,
) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["checkSession", mobile, sessionId],
    queryFn: async () => {
      if (!actor || !mobile || !sessionId) return false;
      return actor.checkSessionValid(mobile, sessionId);
    },
    enabled: !!actor && !isFetching && enabled && !!mobile && !!sessionId,
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

export function useAddPassage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      content,
      timeMinutes,
    }: {
      title: string;
      content: string;
      timeMinutes: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addPassage(title, content, timeMinutes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passages"] });
    },
  });
}

export function useUpdatePassage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      title,
      content,
      timeMinutes,
    }: {
      id: string;
      title: string;
      content: string;
      timeMinutes: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      const result = await actor.updatePassage(id, title, content, timeMinutes);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passages"] });
    },
  });
}

export function useDeletePassage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      const result = await actor.deletePassage(id);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passages"] });
    },
  });
}

export function useSubmitTestResult() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      userName,
      userMobile,
      passageTitle,
      wpm,
      accuracy,
      mistakes,
    }: {
      userName: string;
      userMobile: string;
      passageTitle: string;
      wpm: bigint;
      accuracy: bigint;
      mistakes: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.submitTestResult(
        userName,
        userMobile,
        passageTitle,
        wpm,
        accuracy,
        mistakes,
      );
    },
  });
}

export function useSeedData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.seedData();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passages"] });
    },
  });
}
