'use client';

import AdminHostelManagement from '@/components/admin-hostel-management';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';

const AdminHostelPage: React.FC = () => {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (role !== 'admin') {
        router.push('/unauthorized');
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, authLoading, role, router]);

  if (authLoading || !isAuthorized) {
    return <LoadingSpinner />;
  }
  return (
    <div className="h-full w-full">
      <AdminHostelManagement />
    </div>
  );
};

export default AdminHostelPage;
