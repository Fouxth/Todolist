import { useState } from 'react';
import { Mail, MoreHorizontal, CheckSquare, Clock, TrendingUp, UserPlus, Plus, Trash2, Shield, Users2 } from 'lucide-react';
import type { User, Task, Team } from '@/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
// DropdownMenu removed — not currently used
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TeamMembersProps {
  users: User[];
  tasks: Task[];
  teams: Team[];
  onAddTeamMember: (teamId: string, userId: string, role: string) => Promise<unknown>;
  onRemoveTeamMember: (teamId: string, userId: string) => Promise<unknown>;
  onCreateTeam: (data: { name: string; description: string; color: string; members?: { userId: string; role: string }[] }) => Promise<unknown>;
  onDeleteTeam: (teamId: string) => Promise<unknown>;
  onInviteUser: (data: { name: string; email: string; password: string; role: string; department?: string }) => Promise<User>;
  onRefreshUsers: () => Promise<void>;
}

const roleColors: Record<string, string> = {
  admin: 'text-purple-400 bg-purple-400/10',
  developer: 'text-blue-400 bg-blue-400/10',
  designer: 'text-pink-400 bg-pink-400/10',
  tester: 'text-green-400 bg-green-400/10',
  manager: 'text-orange-400 bg-orange-400/10'
};

const teamColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

export function TeamMembers({ users, tasks, teams, onAddTeamMember, onRemoveTeamMember, onCreateTeam, onDeleteTeam, onInviteUser, onRefreshUsers }: TeamMembersProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const { t } = useLanguage();

  // Add member form state
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  // Invite form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState('developer');
  const [inviteDepartment, setInviteDepartment] = useState('Engineering');
  const [inviteTeamId, setInviteTeamId] = useState('');

  // Create team form state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(teamColors[0]);

  const roleLabels: Record<string, string> = {
    admin: t.teamPage.admin,
    developer: t.teamPage.developer,
    designer: t.teamPage.designer,
    tester: t.teamPage.tester,
    manager: t.teamPage.manager,
  };

  const getUserStats = (userId: string) => {
    const userTasks = tasks.filter(t => t.assignees.includes(userId));
    const completed = userTasks.filter(t => t.status === 'done').length;
    const inProgress = userTasks.filter(t => t.status === 'in-progress').length;
    const totalTime = userTasks.reduce((sum, t) => sum + (t.timeTracking?.spent || 0), 0);

    return {
      total: userTasks.length,
      completed,
      inProgress,
      totalTime: Math.floor(totalTime / 60)
    };
  };

  const getUserTeams = (userId: string) => {
    return teams.filter(team =>
      team.members.some(m => m.userId === userId)
    );
  };

  const resetAddMemberForm = () => {
    setSelectedTeamId('');
    setSelectedUserId('');
    setSelectedRole('member');
  };

  const resetInviteForm = () => {
    setInviteName('');
    setInviteEmail('');
    setInvitePassword('');
    setInviteRole('developer');
    setInviteDepartment('Engineering');
    setInviteTeamId('');
  };

  const resetCreateTeamForm = () => {
    setNewTeamName('');
    setNewTeamDesc('');
    setNewTeamColor(teamColors[0]);
  };

  const handleAddExistingMember = async () => {
    if (!selectedTeamId || !selectedUserId) return;
    const team = teams.find(t => t.id === selectedTeamId);
    if (team?.members.some(m => m.userId === selectedUserId)) {
      toast.error(t.teamPage.userAlreadyInTeam);
      return;
    }
    try {
      await onAddTeamMember(selectedTeamId, selectedUserId, selectedRole);
      toast.success(t.teamPage.memberAdded);
      resetAddMemberForm();
      setAddMemberOpen(false);
    } catch {
      toast.error(t.common.createError);
    }
  };

  const handleInviteNewMember = async () => {
    if (!inviteName || !inviteEmail || !invitePassword) return;
    try {
      const newUser = await onInviteUser({
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole,
        department: inviteDepartment,
      });
      if (inviteTeamId && newUser?.id) {
        await onAddTeamMember(inviteTeamId, newUser.id, 'member');
      }
      await onRefreshUsers();
      toast.success(t.teamPage.inviteSuccess);
      resetInviteForm();
      setAddMemberOpen(false);
    } catch {
      toast.error(t.common.createError);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName) return;
    try {
      await onCreateTeam({
        name: newTeamName,
        description: newTeamDesc,
        color: newTeamColor,
      });
      toast.success(t.teamPage.teamCreated);
      resetCreateTeamForm();
      setCreateTeamOpen(false);
    } catch {
      toast.error(t.common.createError);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      await onRemoveTeamMember(teamId, userId);
      toast.success(t.teamPage.memberRemoved);
    } catch {
      toast.error(t.common.deleteError);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await onDeleteTeam(teamId);
      toast.success(t.teamPage.teamDeleted);
    } catch {
      toast.error(t.common.deleteError);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Add Member Dialog */}
        <Dialog open={addMemberOpen} onOpenChange={(open) => { setAddMemberOpen(open); if (!open) { resetAddMemberForm(); resetInviteForm(); } }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white rounded-lg transition-colors">
              <UserPlus className="w-4 h-4" />
              {t.teamPage.addMember}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-[#1a1a1a] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>{t.teamPage.addMember}</DialogTitle>
              <DialogDescription className="text-gray-400">
                {t.teamPage.addMemberDesc}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="existing" className="mt-4">
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger value="existing" className="data-[state=active]:bg-[var(--orange)] data-[state=active]:text-white">
                  {t.teamPage.addExisting}
                </TabsTrigger>
                <TabsTrigger value="invite" className="data-[state=active]:bg-[var(--orange)] data-[state=active]:text-white">
                  {t.teamPage.inviteNew}
                </TabsTrigger>
              </TabsList>

              {/* Add existing user tab */}
              <TabsContent value="existing" className="space-y-4 mt-4">
                {teams.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">{t.teamPage.noTeams}</p>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.selectTeam}</label>
                      <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder={t.teamPage.selectTeam} />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/10">
                          {teams.map(team => (
                            <SelectItem key={team.id} value={team.id} className="text-white hover:bg-white/10">
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                                {team.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.selectUser}</label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder={t.teamPage.selectUser} />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/10">
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id} className="text-white hover:bg-white/10">
                              <span className="flex items-center gap-2">
                                <img src={user.avatar} alt="" className="w-5 h-5 rounded-full" />
                                {user.name}
                                <span className="text-gray-500 text-xs">({roleLabels[user.role] || user.role})</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.selectRole}</label>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/10">
                          <SelectItem value="lead" className="text-white hover:bg-white/10">
                            <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-yellow-400" />{t.teamPage.teamLead}</span>
                          </SelectItem>
                          <SelectItem value="member" className="text-white hover:bg-white/10">
                            <span className="flex items-center gap-2"><Users2 className="w-4 h-4 text-blue-400" />{t.teamPage.member}</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <button
                      onClick={handleAddExistingMember}
                      disabled={!selectedTeamId || !selectedUserId}
                      className="w-full py-2 bg-[var(--orange)] hover:bg-[var(--orange)]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      {t.teamPage.addMember}
                    </button>
                  </>
                )}
              </TabsContent>

              {/* Invite new user tab */}
              <TabsContent value="invite" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.name}</label>
                    <input
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--orange)]/50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.email}</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--orange)]/50"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.password}</label>
                  <input
                    type="password"
                    value={invitePassword}
                    onChange={e => setInvitePassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--orange)]/50"
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.role}</label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        {(['developer', 'designer', 'tester', 'manager'] as const).map(role => (
                          <SelectItem key={role} value={role} className="text-white hover:bg-white/10">
                            {roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.department}</label>
                    <Select value={inviteDepartment} onValueChange={setInviteDepartment}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        {[
                          { value: 'Engineering', label: t.teamPage.engineering },
                          { value: 'Design', label: t.teamPage.design },
                          { value: 'QA', label: t.teamPage.qa },
                          { value: 'Management', label: t.teamPage.management },
                        ].map(dept => (
                          <SelectItem key={dept.value} value={dept.value} className="text-white hover:bg-white/10">
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {teams.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.selectTeam}</label>
                    <Select value={inviteTeamId} onValueChange={setInviteTeamId}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder={t.teamPage.selectTeam} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id} className="text-white hover:bg-white/10">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                              {team.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <button
                  onClick={handleInviteNewMember}
                  disabled={!inviteName || !inviteEmail || !invitePassword}
                  className="w-full py-2 bg-[var(--orange)] hover:bg-[var(--orange)]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {t.teamPage.inviteNew}
                </button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Create Team Dialog */}
        <Dialog open={createTeamOpen} onOpenChange={(open) => { setCreateTeamOpen(open); if (!open) resetCreateTeamForm(); }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              {t.teamPage.createTeam}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] bg-[#1a1a1a] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>{t.teamPage.createTeam}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.teamName}</label>
                <input
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--orange)]/50"
                  placeholder="Frontend Team"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.teamDescription}</label>
                <input
                  value={newTeamDesc}
                  onChange={e => setNewTeamDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--orange)]/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t.teamPage.teamColor}</label>
                <div className="flex gap-2 flex-wrap">
                  {teamColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTeamColor(color)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        newTeamColor === color && 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateTeam}
                disabled={!newTeamName}
                className="w-full py-2 bg-[var(--orange)] hover:bg-[var(--orange)]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {t.teamPage.createTeam}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Teams Section */}
      {teams.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-[var(--orange)]" />
            {t.teamPage.manageTeams}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <div key={team.id} className="p-4 rounded-xl bg-[#1a1a1a] border border-white/5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                    <h4 className="font-semibold text-white">{team.name}</h4>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#1a1a1a] border-white/10 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.teamPage.deleteTeam}</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          {t.teamPage.confirmDeleteTeam}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 text-white border-white/10 hover:bg-white/10">
                          {t.common.cancel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteTeam(team.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {t.teamPage.deleteTeam}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {team.description && (
                  <p className="text-sm text-gray-400 mb-3">{team.description}</p>
                )}
                <div className="space-y-2">
                  {team.members.map(member => {
                    const user = users.find(u => u.id === member.userId);
                    if (!user) return null;
                    return (
                      <div key={member.userId} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2">
                          <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
                          <span className="text-sm text-white">{user.name}</span>
                          {member.role === 'lead' && (
                            <Shield className="w-3.5 h-3.5 text-yellow-400" />
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#1a1a1a] border-white/10 text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.teamPage.removeMember}</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                {t.teamPage.confirmRemoveMember}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white/5 text-white border-white/10 hover:bg-white/10">
                                {t.common.cancel}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveMember(team.id, member.userId)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                {t.teamPage.removeMember}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );
                  })}
                  {team.members.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">No members</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Grid + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((user, index) => {
              const stats = getUserStats(user.id);
              const userTeams = getUserTeams(user.id);

            return (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={cn(
                  "group p-4 rounded-xl bg-[#1a1a1a] border border-white/5 cursor-pointer",
                  "transition-all duration-300 card-hover",
                  selectedUser?.id === user.id && "border-[var(--orange)]/50 bg-[var(--orange)]/5"
                )}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar with status */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-[var(--orange)]/50 transition-all"
                    />
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1a1a1a]",
                      user.status === 'online' && "status-online",
                      user.status === 'busy' && "status-busy",
                      user.status === 'away' && "status-away",
                      user.status === 'offline' && "status-offline"
                    )} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-[var(--orange)] transition-colors">
                          {user.name}
                        </h3>
                        <p className="text-sm text-gray-400">{user.department}</p>
                      </div>
                      <div>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded">
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Role badge */}
                    <span className={cn(
                      "inline-block px-2 py-0.5 text-xs rounded-full mt-2",
                      roleColors[user.role]
                    )}>
                      {roleLabels[user.role] || user.role}
                    </span>

                    {/* Team badges */}
                    {userTeams.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {userTeams.map(team => (
                          <span
                            key={team.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full bg-white/5 text-gray-400"
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: team.color }} />
                            {team.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Current task */}
                    {user.currentTask && (
                      <p className="text-sm text-gray-400 mt-2 truncate">
                        <span className="text-[var(--orange)]">●</span> {user.currentTask}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-sm">
                        <CheckSquare className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300">{stats.completed}/{stats.total}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-300">{stats.totalTime}h</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected User Details */}
      <div className="glass rounded-xl p-6">
        {selectedUser ? (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <img
                src={selectedUser.avatar}
                alt={selectedUser.name}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-[var(--orange)]/50"
              />
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedUser.name}</h3>
                <p className="text-gray-400">{selectedUser.email}</p>
                <span className={cn(
                  "inline-block px-2 py-0.5 text-xs rounded-full mt-1",
                  roleColors[selectedUser.role]
                )}>
                  {roleLabels[selectedUser.role] || selectedUser.role}
                </span>
              </div>
            </div>

            {/* Teams */}
            {getUserTeams(selectedUser.id).length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">{t.teamPage.manageTeams}</p>
                <div className="flex flex-wrap gap-2">
                  {getUserTeams(selectedUser.id).map(team => (
                    <span
                      key={team.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-white/5 text-white"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                      {team.name}
                      {team.members.find(m => m.userId === selectedUser.id)?.role === 'lead' && (
                        <Shield className="w-3 h-3 text-yellow-400" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {(() => {
                const stats = getUserStats(selectedUser.id);
                return (
                  <>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-white">{stats.total}</p>
                      <p className="text-sm text-gray-400">{t.teamPage.totalTasks}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                      <p className="text-sm text-gray-400">{t.teamPage.completed}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
                      <p className="text-sm text-gray-400">{t.teamPage.inProgress}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-[var(--orange)]">{stats.totalTime}h</p>
                      <p className="text-sm text-gray-400">{t.teamPage.timeTracked}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Current Task */}
            {selectedUser.currentTask && (
              <div className="p-4 rounded-lg bg-white/5 mb-4">
                <p className="text-sm text-gray-400 mb-1">{t.teamPage.currentlyWorking}</p>
                <p className="text-white font-medium">{selectedUser.currentTask}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white rounded-lg transition-colors">
                <Mail className="w-4 h-4" />
                {t.teamPage.message}
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">
                <TrendingUp className="w-4 h-4" />
                {t.teamPage.viewReport}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t.teamPage.selectMember}</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
