import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import RequireAuth from '../features/auth/RequireAuth';
import AppLayout from '../components/layout/AppLayout';
import LoadingScreen from '../components/ui/LoadingScreen';

const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const UsersPage = lazy(() => import('../features/users/UsersPage'));
const AcademiesPage = lazy(() => import('../features/academies/AcademiesPage'));
const SeasonsPage = lazy(() => import('../features/seasons/SeasonsPage'));
const GroupsPage = lazy(() => import('../features/groups/GroupsPage'));
const GroupManagePage = lazy(() => import('../features/groups/GroupManagePage'));
const ChildrenPage = lazy(() => import('../features/children/ChildrenPage'));
const ChildProfilePage = lazy(() => import('../features/children/ChildProfilePage'));
const PublicQuestionnairePage = lazy(
  () => import('../features/public-questionnaire/PublicQuestionnairePage')
);
const DailyEvaluationPage = lazy(() => import('../features/social/DailyEvaluationPage'));
const WeeklySummaryPage = lazy(() => import('../features/social/WeeklySummaryPage'));
const CreativityChallengesPage = lazy(
  () => import('../features/creativity/CreativityChallengesPage')
);
const SportsChallengesPage = lazy(() => import('../features/sports/SportsChallengesPage'));
const SportsChallengeDetailPage = lazy(
  () => import('../features/sports/SportsChallengeDetailPage')
);
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const GroupReportPage = lazy(() => import('../features/reports/GroupReportPage'));
const MyGroupsPage = lazy(() => import('../features/coach/MyGroupsPage'));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

function RouteLoader({ children }) {
  return <Suspense fallback={<LoadingScreen fullPage={false} />}>{children}</Suspense>;
}

function LoginRoute() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <RouteLoader>
      <LoginPage />
    </RouteLoader>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/unauthorized"
        element={
          <RouteLoader>
            <UnauthorizedPage />
          </RouteLoader>
        }
      />
      <Route
        path="/questionnaire/:token"
        element={
          <RouteLoader>
            <PublicQuestionnairePage />
          </RouteLoader>
        }
      />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <RouteLoader>
                <DashboardPage />
              </RouteLoader>
            }
          />

          <Route
            path="/users"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin']}>
                <RouteLoader>
                  <UsersPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/academies"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager']}>
                <RouteLoader>
                  <AcademiesPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/seasons"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager']}>
                <RouteLoader>
                  <SeasonsPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/groups"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager']}>
                <RouteLoader>
                  <GroupsPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/groups/:id/manage"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <GroupManagePage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/coach/my-groups"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <MyGroupsPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/children"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <ChildrenPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/children/:id/profile"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <ChildProfilePage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/social/daily"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <DailyEvaluationPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/social/weekly"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <WeeklySummaryPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/creativity"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <CreativityChallengesPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/sports"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <SportsChallengesPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/sports/challenges/:challengeId"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <SportsChallengeDetailPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/reports"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <ReportsPage />
                </RouteLoader>
              </RequireAuth>
            }
          />

          <Route
            path="/reports/groups/:groupId"
            element={
              <RequireAuth allowedRoles={['super_admin', 'admin', 'manager', 'coach']}>
                <RouteLoader>
                  <GroupReportPage />
                </RouteLoader>
              </RequireAuth>
            }
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <RouteLoader>
            <NotFoundPage />
          </RouteLoader>
        }
      />
    </Routes>
  );
}
