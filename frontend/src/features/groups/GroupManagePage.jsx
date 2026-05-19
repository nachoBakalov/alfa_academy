import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import LoadingScreen from '../../components/ui/LoadingScreen';
import Badge from '../../components/ui/Badge';
import groupService from './groupService';
import GroupCoachesPanel from './GroupCoachesPanel';
import GroupChildrenPanel from './GroupChildrenPanel';
import { useAuth } from '../auth/AuthProvider';
import { getApiErrorMessage } from '../../utils/errorMessage';

export default function GroupManagePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const backTo = user?.role === 'coach' ? '/coach/my-groups' : '/groups';

  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadGroup = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await groupService.getGroupById(id);
      setGroup(response);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  if (isLoading) {
    return <LoadingScreen fullPage={false} />;
  }

  if (!group) {
    return (
      <div className="page-stack">
        <Alert type="error">{errorMessage || 'Групата не е намерена.'}</Alert>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={`Управление: ${group.name}`}
        description="Настройки за треньори и деца в групата."
        actions={
          <Link className="btn btn-secondary btn-md" to={backTo}>
            Назад
          </Link>
        }
      />

      {errorMessage ? <Alert type="error">{errorMessage}</Alert> : null}

      <Card>
        <div className="group-manage-header">
          <div>
            <h3>{group.name}</h3>
            <p>{group.academy?.name || '-'}</p>
          </div>
          <div className="group-manage-badges">
            <Badge tone={group.isActive ? 'success' : 'neutral'}>
              {group.isActive ? 'Активна група' : 'Неактивна група'}
            </Badge>
          </div>
        </div>
      </Card>

      <GroupCoachesPanel group={group} />

      <GroupChildrenPanel
        group={group}
        canTransfer={['super_admin', 'admin', 'manager'].includes(user?.role)}
        userRole={user?.role}
      />
    </div>
  );
}
