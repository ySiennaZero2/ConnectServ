import { ReputationHistoryScreen } from '@/components/reputation/ReputationHistoryScreen';
import { useAppStore } from '@/store/useAppStore';
import type { UserRole } from '@/types';

type CommentsHistoryScreenProps = {
  role: UserRole;
  onBack: () => void;
};

export function CommentsHistoryScreen({ role, onBack }: CommentsHistoryScreenProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  if (!currentUser) return null;

  return (
    <ReputationHistoryScreen
      userId={currentUser.id}
      profileRole={role}
      initialTab="reviews"
      onBack={onBack}
    />
  );
}
