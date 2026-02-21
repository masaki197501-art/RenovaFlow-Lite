/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  PlusCircle, 
  Users, 
  LogOut, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FileText,
  Upload,
  X,
  MapPin,
  User as UserIcon,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from './lib/utils';
import { Project, ProjectStatus, User, OutboundPayment } from './types';

// --- Components ---

const Button = ({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
    ghost: 'bg-transparent text-gray-500 hover:bg-gray-100',
  };
  return (
    <button 
      className={cn('px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50', variants[variant], className)} 
      {...props} 
    />
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden', className)}>
    {children}
  </div>
);

const Dialog = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- Pages ---

const LoginPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const user = await res.json();
      onLogin(user);
    } else {
      setError('メールアドレスまたはパスワードが正しくありません');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl text-white mb-4 shadow-lg shadow-indigo-200">
            <LayoutDashboard size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">RenovaFlow Lite</h1>
          <p className="text-gray-500 mt-2">案件管理を、もっとシンプルに。</p>
        </div>
        
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full py-4 text-lg">ログイン</Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ projects, onProjectClick }: { projects: Project[]; onProjectClick: (id: string) => void }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayProjects = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return {
      estimates: projects.filter(p => p.estimateDate === dayStr),
      orders: projects.filter(p => p.orderDate === dayStr),
      constructions: projects.filter(p => p.constructionStartDate === dayStr),
      completions: projects.filter(p => p.completionDate === dayStr),
    };
  };

  const selectedDayProjects = selectedDay ? getDayProjects(selectedDay) : null;
  const hasSchedules = selectedDayProjects && (
    selectedDayProjects.estimates.length > 0 || 
    selectedDayProjects.orders.length > 0 || 
    selectedDayProjects.constructions.length > 0 || 
    selectedDayProjects.completions.length > 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold min-w-[120px] text-center">
            {format(currentMonth, 'yyyy年 M月', { locale: ja })}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-7 border-b border-gray-100">
          {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
            <div key={day} className={cn('py-3 text-center text-xs font-bold uppercase tracking-wider', i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400')}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const { estimates, orders, constructions, completions } = getDayProjects(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div 
                key={day.toString()} 
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'min-h-[120px] p-2 border-r border-b border-gray-50 last:border-r-0 transition-colors hover:bg-gray-50/50 cursor-pointer',
                  !isCurrentMonth && 'bg-gray-50/30 opacity-40'
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                    isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1">
                  {estimates.map(p => (
                    <button 
                      key={`${p.id}-est`} 
                      onClick={(e) => { e.stopPropagation(); onProjectClick(p.id); }}
                      className="w-full text-left px-2 py-1 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-100 truncate hover:bg-blue-100 transition-colors"
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1" />
                      見積: {p.title}
                    </button>
                  ))}
                  {orders.map(p => (
                    <button 
                      key={`${p.id}-ord`} 
                      onClick={(e) => { e.stopPropagation(); onProjectClick(p.id); }}
                      className="w-full text-left px-2 py-1 bg-amber-50 text-amber-700 text-[10px] rounded border border-amber-100 truncate hover:bg-amber-100 transition-colors"
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />
                      発注: {p.title}
                    </button>
                  ))}
                  {constructions.map(p => (
                    <button 
                      key={`${p.id}-con`} 
                      onClick={(e) => { e.stopPropagation(); onProjectClick(p.id); }}
                      className="w-full text-left px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] rounded border border-indigo-100 truncate hover:bg-indigo-100 transition-colors"
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1" />
                      着工: {p.title}
                    </button>
                  ))}
                  {completions.map(p => (
                    <button 
                      key={`${p.id}-comp`} 
                      onClick={(e) => { e.stopPropagation(); onProjectClick(p.id); }}
                      className="w-full text-left px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] rounded border border-emerald-100 truncate hover:bg-emerald-100 transition-colors"
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                      完了: {p.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog 
        isOpen={!!selectedDay} 
        onClose={() => setSelectedDay(null)} 
        title={selectedDay ? format(selectedDay, 'yyyy年MM月dd日の予定', { locale: ja }) : ''}
      >
        <div className="space-y-4">
          {hasSchedules ? (
            <div className="space-y-6">
              {selectedDayProjects.estimates.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-blue-500 uppercase mb-2">見積提出予定</h4>
                  <div className="space-y-2">
                    {selectedDayProjects.estimates.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => { onProjectClick(p.id); setSelectedDay(null); }}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
                      >
                        <span className="font-bold text-blue-700">{p.title}</span>
                        <ChevronRight size={16} className="text-blue-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedDayProjects.orders.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-500 uppercase mb-2">発注予定</h4>
                  <div className="space-y-2">
                    {selectedDayProjects.orders.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => { onProjectClick(p.id); setSelectedDay(null); }}
                        className="w-full flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors"
                      >
                        <span className="font-bold text-amber-700">{p.title}</span>
                        <ChevronRight size={16} className="text-amber-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedDayProjects.constructions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-indigo-500 uppercase mb-2">着工予定</h4>
                  <div className="space-y-2">
                    {selectedDayProjects.constructions.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => { onProjectClick(p.id); setSelectedDay(null); }}
                        className="w-full flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors"
                      >
                        <span className="font-bold text-indigo-700">{p.title}</span>
                        <ChevronRight size={16} className="text-indigo-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedDayProjects.completions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase mb-2">完了予定</h4>
                  <div className="space-y-2">
                    {selectedDayProjects.completions.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => { onProjectClick(p.id); setSelectedDay(null); }}
                        className="w-full flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors"
                      >
                        <span className="font-bold text-emerald-700">{p.title}</span>
                        <ChevronRight size={16} className="text-emerald-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">この日の予定はありません</p>
            </div>
          )}
          <Button variant="secondary" className="w-full" onClick={() => setSelectedDay(null)}>閉じる</Button>
        </div>
      </Dialog>
    </div>
  );
};

const ProjectList = ({ 
  projects, 
  onProjectClick, 
  onDeleteProject,
  activeTab,
  setActiveTab
}: { 
  projects: Project[]; 
  onProjectClick: (id: string) => void; 
  onDeleteProject: (id: string) => void;
  activeTab: ProjectStatus | '全て';
  setActiveTab: (tab: ProjectStatus | '全て') => void;
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const statuses: (ProjectStatus | '全て')[] = ['全て', '見積', '発注', '施工', '請求', '入金', '支払い', 'キャンセル案件'];
  const filteredProjects = activeTab === '全て' ? projects : projects.filter(p => p.status === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">案件一覧</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {statuses.map(status => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={cn(
              'px-6 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all',
              activeTab === status 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            )}
          >
            {status} ({status === '全て' ? projects.length : projects.filter(p => p.status === status).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProjects.length > 0 ? (
            filteredProjects.map(project => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className="group hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                          project.status === 'キャンセル案件' ? "bg-red-100 text-red-700" : 
                          project.status === '見積' ? "bg-blue-100 text-blue-700" :
                          project.status === '発注' ? "bg-amber-100 text-amber-700" :
                          project.status === '施工' ? "bg-emerald-100 text-emerald-700" :
                          project.status === '請求' ? "bg-purple-100 text-purple-700" :
                          project.status === '入金' ? "bg-indigo-100 text-indigo-700" :
                          project.status === '支払い' ? "bg-pink-100 text-pink-700" :
                          "bg-gray-100 text-gray-700"
                        )}>
                          {project.status}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{project.title}</h3>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <UserIcon size={16} className="text-gray-400" />
                        <span>{project.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-gray-400" />
                        <span className="truncate">{project.customerAddress}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-blue-50 p-2 rounded-lg">
                          <p className="text-[10px] text-blue-500 font-bold uppercase">見積日</p>
                          <p className="font-semibold text-blue-700">{project.estimateDate}</p>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-lg">
                          <p className="text-[10px] text-emerald-500 font-bold uppercase">完了予定</p>
                          <p className="font-semibold text-emerald-700">{project.completionDate}</p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="w-full mt-6"
                      onClick={() => onProjectClick(project.id)}
                    >
                      詳細を見る
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <Clock size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">このステータスの案件はありません</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <Dialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        title="案件の削除"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <p className="text-gray-600 mb-6">この案件を削除してもよろしいですか？<br/>この操作は取り消せません。</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteId(null)}>キャンセル</Button>
            <Button variant="danger" className="flex-1" onClick={() => { if (deleteId) { onDeleteProject(deleteId); setDeleteId(null); } }}>削除する</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

const ProjectForm = ({ onSave, initialData, title: formTitle = "新規案件登録" }: { onSave: (project: Omit<Project, 'id'>) => Promise<void>; initialData?: Partial<Project>; title?: string }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    propertyName: initialData?.propertyName || '',
    status: initialData?.status || '見積' as ProjectStatus,
    estimateDate: initialData?.estimateDate || format(new Date(), 'yyyy-MM-dd'),
    orderDate: initialData?.orderDate || '',
    constructionStartDate: initialData?.constructionStartDate || '',
    completionDate: initialData?.completionDate || format(new Date(), 'yyyy-MM-dd'),
    customerName: initialData?.customerName || '',
    customerZipCode: initialData?.customerZipCode || '',
    customerAddress: initialData?.customerAddress || '',
    customerTel: initialData?.customerTel || '',
    customerEmail: initialData?.customerEmail || '',
    estimateRemarks: initialData?.estimateRemarks || '',
    orderRemarks: initialData?.orderRemarks || '',
    constructionRemarks: initialData?.constructionRemarks || '',
    billingRemarks: initialData?.billingRemarks || '',
    paymentRemarks: initialData?.paymentRemarks || '',
    outboundPaymentRemarks: initialData?.outboundPaymentRemarks || '',
    constructionStaff: initialData?.constructionStaff || [] as { id: string; name: string; zipCode: string; address: string; tel: string; email: string; }[],
    billingItems: initialData?.billingItems?.map(b => ({ ...b, amount: b.amount.toString() })) || [] as { id: string; name: string; amount: string; expectedPaymentDate: string; isBilled: boolean; isPaid: boolean; }[],
    outboundPayments: initialData?.outboundPayments?.map(p => ({ ...p, amount: p.amount.toString() })) || [] as { id: string; recipient: string; amount: string; expectedDate: string; isPaid: boolean; }[],
  });

  const addStaff = () => {
    setFormData({
      ...formData,
      constructionStaff: [
        ...formData.constructionStaff,
        { id: Date.now().toString(), name: '', zipCode: '', address: '', tel: '', email: '' }
      ]
    });
  };

  const removeStaff = (id: string) => {
    setFormData({
      ...formData,
      constructionStaff: formData.constructionStaff.filter(s => s.id !== id)
    });
  };

  const updateStaff = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      constructionStaff: formData.constructionStaff.map(s => s.id === id ? { ...s, [field]: value } : s)
    });
  };

  const addBilling = () => {
    setFormData({
      ...formData,
      billingItems: [
        ...formData.billingItems,
        { id: Date.now().toString(), name: '', amount: '', expectedPaymentDate: format(new Date(), 'yyyy-MM-dd'), isBilled: false, isPaid: false }
      ]
    });
  };

  const removeBilling = (id: string) => {
    setFormData({
      ...formData,
      billingItems: formData.billingItems.filter(b => b.id !== id)
    });
  };

  const updateBilling = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      billingItems: formData.billingItems.map(b => b.id === id ? { ...b, [field]: value } : b)
    });
  };

  const addOutboundPayment = () => {
    setFormData({
      ...formData,
      outboundPayments: [
        ...formData.outboundPayments,
        { id: Date.now().toString(), recipient: '', amount: '', expectedDate: format(new Date(), 'yyyy-MM-dd'), isPaid: false }
      ]
    });
  };

  const removeOutboundPayment = (id: string) => {
    setFormData({
      ...formData,
      outboundPayments: formData.outboundPayments.filter(p => p.id !== id)
    });
  };

  const updateOutboundPayment = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      outboundPayments: formData.outboundPayments.map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const submissionData = {
        ...formData,
        billingItems: formData.billingItems.map(b => ({
          ...b,
          amount: parseInt(b.amount.replace(/,/g, '')) || 0
        })),
        outboundPayments: formData.outboundPayments.map(p => ({
          ...p,
          amount: parseInt(p.amount.replace(/,/g, '')) || 0
        }))
      };
      await onSave(submissionData as any);
    } finally {
      setIsSaving(false);
    }
  };

  const formatNumber = (val: string) => {
    const num = val.replace(/,/g, '');
    if (isNaN(Number(num))) return val;
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{formTitle}</h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 重要日付 */}
        <Card className="p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <CalendarIcon size={20} className="text-indigo-600" />
            重要日付・スケジュール
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={cn(
              "p-4 rounded-xl border transition-all",
              formData.status === '見積' ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20" : "bg-white border-gray-100"
            )}>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">見積提出予定日</label>
              <input 
                type="date" 
                value={formData.estimateDate}
                onChange={(e) => setFormData({ ...formData, estimateDate: e.target.value })}
                className="w-full bg-transparent font-bold outline-none"
                required
              />
              {formData.status === '見積' && <p className="text-[10px] text-indigo-600 mt-1 font-bold">● 現在の工程</p>}
            </div>
            <div className={cn(
              "p-4 rounded-xl border transition-all",
              formData.status === '発注' ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20" : "bg-white border-gray-100"
            )}>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">発注予定日</label>
              <input 
                type="date" 
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                className="w-full bg-transparent font-bold outline-none"
              />
              {formData.status === '発注' && <p className="text-[10px] text-indigo-600 mt-1 font-bold">● 現在の工程</p>}
            </div>
            <div className={cn(
              "p-4 rounded-xl border transition-all",
              formData.status === '施工' ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20" : "bg-white border-gray-100"
            )}>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">着工予定日</label>
              <input 
                type="date" 
                value={formData.constructionStartDate}
                onChange={(e) => setFormData({ ...formData, constructionStartDate: e.target.value })}
                className="w-full bg-transparent font-bold outline-none"
              />
              {formData.status === '施工' && <p className="text-[10px] text-indigo-600 mt-1 font-bold">● 現在の工程</p>}
            </div>
            <div className={cn(
              "p-4 rounded-xl border transition-all",
              formData.status === '請求' ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20" : "bg-white border-gray-100"
            )}>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">完了予定日</label>
              <input 
                type="date" 
                value={formData.completionDate}
                onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                className="w-full bg-transparent font-bold outline-none"
                required
              />
              {formData.status === '請求' && <p className="text-[10px] text-indigo-600 mt-1 font-bold">● 現在の工程</p>}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">見積備考</label>
              <textarea 
                value={formData.estimateRemarks}
                onChange={(e) => setFormData({ ...formData, estimateRemarks: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="見積に関するメモ..."
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">発注備考</label>
              <textarea 
                value={formData.orderRemarks}
                onChange={(e) => setFormData({ ...formData, orderRemarks: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="発注に関するメモ..."
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* 案件名 */}
        <Card className="p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Briefcase size={20} className="text-indigo-600" />
            案件情報
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">案件名</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="例：〇〇様邸 キッチン改修工事"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">物件名</label>
              <input 
                type="text" 
                value={formData.propertyName}
                onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="例：メゾン・ド・フルール 201号室"
              />
            </div>
          </div>
        </Card>

        {/* 顧客情報 */}
        <Card className="p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <UserIcon size={20} className="text-indigo-600" />
            顧客情報
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">顧客氏名</label>
                <input 
                  type="text" 
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="山田 太郎"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                <input 
                  type="text" 
                  value={formData.customerZipCode}
                  onChange={(e) => setFormData({ ...formData, customerZipCode: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="123-4567"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
              <input 
                type="text" 
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="東京都渋谷区..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                <input 
                  type="tel" 
                  value={formData.customerTel}
                  onChange={(e) => setFormData({ ...formData, customerTel: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="090-0000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input 
                  type="email" 
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="example@mail.com"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 施工担当 */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-indigo-600" />
              施工担当
            </h3>
            <Button type="button" variant="secondary" onClick={addStaff} className="flex items-center gap-2">
              <PlusCircle size={16} />
              担当を追加
            </Button>
          </div>
          <div className="space-y-6">
            {formData.constructionStaff.map((staff, index) => (
              <div key={staff.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative">
                <button 
                  type="button" 
                  onClick={() => removeStaff(staff.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                >
                  <X size={20} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">担当名称</label>
                    <input 
                      type="text" 
                      value={staff.name}
                      onChange={(e) => updateStaff(staff.id, 'name', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      placeholder="施工会社A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                    <input 
                      type="text" 
                      value={staff.zipCode}
                      onChange={(e) => updateStaff(staff.id, 'zipCode', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      placeholder="123-4567"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                    <input 
                      type="text" 
                      value={staff.address}
                      onChange={(e) => updateStaff(staff.id, 'address', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      placeholder="住所を入力"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                    <input 
                      type="tel" 
                      value={staff.tel}
                      onChange={(e) => updateStaff(staff.id, 'tel', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      placeholder="03-0000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                    <input 
                      type="email" 
                      value={staff.email}
                      onChange={(e) => updateStaff(staff.id, 'email', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      placeholder="staff@example.com"
                    />
                  </div>
                </div>
              </div>
            ))}
            {formData.constructionStaff.length === 0 && (
              <p className="text-center py-6 text-gray-400 text-sm">担当者が登録されていません</p>
            )}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">施工備考</label>
              <textarea 
                value={formData.constructionRemarks}
                onChange={(e) => setFormData({ ...formData, constructionRemarks: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="施工に関するメモ..."
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* 請求管理 */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-indigo-600" />
              請求管理
            </h3>
            <Button type="button" variant="secondary" onClick={addBilling} className="flex items-center gap-2">
              <PlusCircle size={16} />
              請求を追加
            </Button>
          </div>
          <div className="space-y-6">
            {formData.billingItems.map((bill, index) => (
              <div key={bill.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative">
                <button 
                  type="button" 
                  onClick={() => removeBilling(bill.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                >
                  <X size={20} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">請求名称</label>
                    <input 
                      type="text" 
                      value={bill.name}
                      onChange={(e) => updateBilling(bill.id, 'name', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      placeholder="着工金"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">金額 (円)</label>
                    <input 
                      type="text" 
                      value={formatNumber(bill.amount)}
                      onChange={(e) => updateBilling(bill.id, 'amount', e.target.value.replace(/,/g, ''))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      placeholder="100,000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">入金予定日</label>
                    <input 
                      type="date" 
                      value={bill.expectedPaymentDate}
                      onChange={(e) => updateBilling(bill.id, 'expectedPaymentDate', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
            {formData.billingItems.length === 0 && (
              <p className="text-center py-6 text-gray-400 text-sm">請求情報が登録されていません</p>
            )}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">請求備考</label>
                <textarea 
                  value={formData.billingRemarks}
                  onChange={(e) => setFormData({ ...formData, billingRemarks: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="請求に関するメモ..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">入金備考</label>
                <textarea 
                  value={formData.paymentRemarks}
                  onChange={(e) => setFormData({ ...formData, paymentRemarks: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="入金に関するメモ..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 支払い管理 */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <LogOut size={20} className="text-indigo-600" />
              支払い管理
            </h3>
            <Button type="button" variant="secondary" onClick={addOutboundPayment} className="flex items-center gap-2">
              <PlusCircle size={16} />
              支払いを追加
            </Button>
          </div>
          <div className="space-y-6">
            {formData.outboundPayments.map((payment, index) => (
              <div key={payment.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 relative">
                <button 
                  type="button" 
                  onClick={() => removeOutboundPayment(payment.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                >
                  <X size={20} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">支払い先</label>
                    <input 
                      type="text" 
                      value={payment.recipient}
                      onChange={(e) => updateOutboundPayment(payment.id, 'recipient', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      placeholder="施工会社A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">金額 (円)</label>
                    <input 
                      type="text" 
                      value={formatNumber(payment.amount)}
                      onChange={(e) => updateOutboundPayment(payment.id, 'amount', e.target.value.replace(/,/g, ''))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      placeholder="50,000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">支払い予定日</label>
                    <input 
                      type="date" 
                      value={payment.expectedDate}
                      onChange={(e) => updateOutboundPayment(payment.id, 'expectedDate', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
            {formData.outboundPayments.length === 0 && (
              <p className="text-center py-6 text-gray-400 text-sm">支払い情報が登録されていません</p>
            )}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">支払い備考</label>
              <textarea 
                value={formData.outboundPaymentRemarks}
                onChange={(e) => setFormData({ ...formData, outboundPaymentRemarks: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="支払いに関するメモ..."
                rows={3}
              />
            </div>
          </div>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1 py-4 text-lg" disabled={isSaving}>
            {isSaving ? (
              <div className="flex items-center justify-center gap-2">
                <Clock className="animate-spin" size={20} />
                <span>保存中...</span>
              </div>
            ) : (
              initialData ? '案件を更新する' : '案件を登録する'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

const ProjectDetail = ({ projectId, onBack, onRefresh }: { projectId: string; onBack: (targetTab?: ProjectStatus | '全て') => void; onRefresh: () => void }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [sharePointError, setSharePointError] = useState<string | null>(null);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      fetchProject();
    }
  };

  const handleCreateSharePointFolder = async () => {
    if (!project) return;
    setIsCreatingFolder(true);
    setSharePointError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/sharepoint-folder`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'フォルダ作成に失敗しました');
      }
      alert('SharePointフォルダを作成または確認しました。');
    } catch (error) {
      setSharePointError(error instanceof Error ? error.message : '不明なエラーが発生しました');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchProject();
      setDeleteFileId(null);
    }
  };

  const handleRemarksUpdate = async (field: 'estimateRemarks' | 'orderRemarks' | 'constructionRemarks' | 'billingRemarks' | 'paymentRemarks' | 'outboundPaymentRemarks', value: string) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      fetchProject();
    }
  };

  const handleBillingItemUpdate = async (itemId: string, updates: { isBilled?: boolean; isPaid?: boolean }) => {
    const res = await fetch(`/api/billing_items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      // After updating a billing item, check if we should advance the project status
      const updatedProjectRes = await fetch(`/api/projects/${projectId}`);
      if (updatedProjectRes.ok) {
        const updatedProject: Project = await updatedProjectRes.json();
        setProject(updatedProject);
        
        // Auto-advance logic
        if (updates.isBilled !== undefined) {
          const allBilled = updatedProject.billingItems.every(b => b.isBilled);
          if (allBilled && updatedProject.status === '請求') {
            handleStatusUpdate('入金');
          }
        }
      }
    }
  };

  const handleOutboundPaymentUpdate = async (itemId: string, updates: { isPaid?: boolean }) => {
    const res = await fetch(`/api/outbound_payments/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      fetchProject();
    }
  };

  const handleStatusUpdate = async (newStatus: ProjectStatus) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      onRefresh(); // Refresh global list
      if (newStatus === 'キャンセル案件') {
        onBack('キャンセル案件');
      } else if (project?.status === 'キャンセル案件' && newStatus === '見積') {
        onBack('見積');
      } else {
        fetchProject();
      }
    }
  };

  const handleEditSave = async (projectData: Omit<Project, 'id'>) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    });
    if (res.ok) {
      onRefresh();
      await fetchProject();
      setIsEditing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Clock className="animate-spin text-indigo-600" /></div>;
  if (!project) return <div>Project not found</div>;

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">案件の編集</h2>
        </div>
        <ProjectForm 
          onSave={handleEditSave} 
          initialData={project} 
          title={`案件の編集: ${project.title}`} 
        />
      </div>
    );
  }

  const progressSteps: ProjectStatus[] = ['見積', '発注', '施工', '請求', '入金', '支払い'];
  const currentStepIndex = progressSteps.indexOf(project.status);
  const isCancelled = project.status === 'キャンセル案件';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{project.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "px-2 py-0.5 text-xs font-bold rounded uppercase",
              isCancelled ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"
            )}>
              {project.status}
            </span>
            <span className="text-gray-400 text-sm">{project.customerName} 様</span>
          </div>
        </div>
      </div>

      {/* 進捗スケジュールセクション */}
      {!isCancelled && (
        <Card className="p-8">
          <div className="relative">
            {/* Background Line */}
            <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-100" />
            
            {/* Progress Line */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(currentStepIndex / (progressSteps.length - 1)) * 100}%` }}
              className="absolute top-5 left-0 h-0.5 bg-indigo-600 z-0" 
              transition={{ duration: 0.8, ease: "circOut" }}
            />

            <div className="relative flex justify-between">
              {progressSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <button 
                    key={step} 
                    onClick={() => handleStatusUpdate(step)}
                    className="flex flex-col items-center group focus:outline-none"
                  >
                    <motion.div 
                      initial={false}
                      animate={{ 
                        backgroundColor: isCompleted ? "#4f46e5" : "#ffffff",
                        borderColor: isCompleted ? "#e0e7ff" : "#f3f4f6",
                        scale: isCurrent ? 1.1 : 1
                      }}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-sm group-hover:shadow-md",
                        isCompleted ? "text-white" : "text-gray-300"
                      )}
                    >
                      {isCompleted && index < currentStepIndex ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </motion.div>
                    <span className={cn(
                      "mt-3 text-[10px] font-bold whitespace-nowrap transition-colors",
                      isCurrent ? "text-indigo-600" : isCompleted ? "text-gray-900" : "text-gray-400",
                      "group-hover:text-indigo-500"
                    )}>
                      {step}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {/* 1. 案件概要 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard size={20} className="text-indigo-600" />
              案件概要
            </h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <FileText size={16} />
                編集
              </Button>
              {isCancelled ? (
                <Button 
                  variant="secondary" 
                  onClick={() => handleStatusUpdate('見積')}
                  className="flex items-center gap-2"
                >
                  <Clock size={16} />
                  案件を再開する
                </Button>
              ) : (
                <Button 
                  variant="danger" 
                  onClick={() => handleStatusUpdate('キャンセル案件')}
                  className="flex items-center gap-2"
                >
                  <X size={16} />
                  案件をキャンセル
                </Button>
              )}
            </div>
          </div>
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">案件名</p>
                  <p className="text-lg font-bold">{project.title}</p>
                </div>
                {project.propertyName && (
                  <div>
                    <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">物件名</p>
                    <p className="text-lg font-bold">{project.propertyName}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">ステータス</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      isCancelled ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"
                    )}>
                      {project.status}
                    </span>
                    {currentStepIndex > 0 && !isCancelled && (
                      <button 
                        onClick={() => handleStatusUpdate(progressSteps[currentStepIndex - 1])}
                        className="text-[10px] text-gray-400 hover:text-indigo-600 underline"
                      >
                        前のステータスに戻す
                      </button>
                    )}
                  </div>
                </div>
                <div className="pt-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleCreateSharePointFolder}
                    disabled={isCreatingFolder}
                    className="w-full flex items-center justify-center gap-2 text-xs"
                  >
                    <Share2 size={14} />
                    {isCreatingFolder ? '作成中...' : 'SharePointフォルダを作成'}
                  </Button>
                  {sharePointError && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium">{sharePointError}</p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">顧客情報</p>
                  <div className="text-sm space-y-1">
                    <p className="font-bold">{project.customerName} 様</p>
                    <p className="text-gray-600">〒{project.customerZipCode} {project.customerAddress}</p>
                    <p className="text-gray-600">TEL: {project.customerTel}</p>
                    <p className="text-gray-600">Email: {project.customerEmail}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* 関連ファイル (Overviewの下に設置) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText size={20} className="text-indigo-600" />
              関連ファイル
            </h3>
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleFileUpload} />
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                <Upload size={16} />
                アップロード
              </div>
            </label>
          </div>
          <Card className="p-6">
            <div className="space-y-2">
              {project.files && project.files.length > 0 ? (
                project.files.map(file => (
                  <div key={file.id} className="group flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                        <FileText size={20} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                    </a>
                    <button 
                      onClick={() => setDeleteFileId(file.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <Upload size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">ファイルがありません。ドラッグ＆ドロップまたはボタンから追加してください。</p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* 2. 見積管理 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText size={20} className="text-indigo-600" />
              見積管理
            </h3>
            {project.status === '見積' && (
              <Button 
                onClick={() => handleStatusUpdate('発注')}
                className="flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                見積提出済
              </Button>
            )}
          </div>
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-sm font-medium text-blue-600">見積提出予定日</span>
              <span className="font-bold text-blue-700">{project.estimateDate}</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">備考欄</label>
              <textarea 
                value={project.estimateRemarks || ''}
                onChange={(e) => handleRemarksUpdate('estimateRemarks', e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="見積に関するメモを入力..."
                rows={3}
              />
            </div>
          </Card>
        </section>

        {/* 3. 発注管理 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Briefcase size={20} className="text-indigo-600" />
              発注管理
            </h3>
            {project.status === '発注' && (
              <Button 
                onClick={() => handleStatusUpdate('施工')}
                className="flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                発注完了
              </Button>
            )}
          </div>
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                currentStepIndex >= 1 ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
              )}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="font-bold text-gray-900">
                  {currentStepIndex >= 1 ? '発注' : '未発注'}
                </p>
                <p className="text-xs text-gray-500">
                  {currentStepIndex >= 1 ? '発注処理が完了しています。' : '発注待ちの状態です。'}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">備考欄</label>
              <textarea 
                value={project.orderRemarks || ''}
                onChange={(e) => handleRemarksUpdate('orderRemarks', e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="発注に関するメモを入力..."
                rows={3}
              />
            </div>
          </Card>
        </section>

        {/* 4. 施工管理 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-indigo-600" />
              施工管理
            </h3>
            {project.status === '施工' && (
              <Button 
                onClick={() => handleStatusUpdate('請求')}
                className="flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                施工
              </Button>
            )}
          </div>
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-sm font-medium text-emerald-600">完了予定日</span>
              <span className="font-bold text-emerald-700">{project.completionDate}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.constructionStaff && project.constructionStaff.length > 0 ? (
                project.constructionStaff.map(staff => (
                  <div key={staff.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-lg font-bold text-gray-900 mb-2">{staff.name}</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>〒{staff.zipCode} {staff.address}</p>
                      <p>TEL: {staff.tel}</p>
                      <p>Email: {staff.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm col-span-full py-4 text-center">担当者が登録されていません</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">備考欄</label>
              <textarea 
                value={project.constructionRemarks || ''}
                onChange={(e) => handleRemarksUpdate('constructionRemarks', e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="施工に関するメモを入力..."
                rows={3}
              />
            </div>
          </Card>
        </section>

        {/* 5. 請求管理 */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-indigo-600" />
            請求管理
          </h3>
          <Card className="p-6 space-y-4">
            <div className="space-y-3">
              {project.billingItems && project.billingItems.length > 0 ? (
                project.billingItems.map(bill => (
                  <div key={bill.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{bill.name}</p>
                      <div className="flex gap-4 mt-1">
                        <p className="text-sm text-gray-500 font-medium">金額: ¥{bill.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500 font-medium">入金予定: {bill.expectedPaymentDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {bill.isBilled ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          請求済み
                        </span>
                      ) : (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleBillingItemUpdate(bill.id, { isBilled: true })}
                          className="text-xs py-1.5"
                        >
                          請求済みにする
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm py-4 text-center">請求情報が登録されていません</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">備考欄</label>
              <textarea 
                value={project.billingRemarks || ''}
                onChange={(e) => handleRemarksUpdate('billingRemarks', e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="請求に関するメモを入力..."
                rows={3}
              />
            </div>
          </Card>
        </section>

        {/* 6. 入金管理 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <LogOut size={20} className="text-indigo-600" />
              入金管理
            </h3>
            {project.status === '入金' && (
              <Button 
                onClick={() => handleStatusUpdate('支払い')}
                className="flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                入金完了
              </Button>
            )}
          </div>
          <Card className="p-6 space-y-6">
            <div className="space-y-3">
              {project.billingItems && project.billingItems.length > 0 ? (
                project.billingItems.map(bill => (
                  <div key={bill.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{bill.name}</p>
                      <div className="flex gap-4 mt-1">
                        <p className="text-sm text-gray-500 font-medium">金額: ¥{bill.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500 font-medium">入金予定: {bill.expectedPaymentDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {bill.isPaid ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          入金済み
                        </span>
                      ) : (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleBillingItemUpdate(bill.id, { isPaid: true })}
                          className="text-xs py-1.5"
                          disabled={!bill.isBilled}
                        >
                          入金済みにする
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm py-4 text-center">入金情報が登録されていません</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">備考欄</label>
              <textarea 
                value={project.paymentRemarks || ''}
                onChange={(e) => handleRemarksUpdate('paymentRemarks', e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="入金に関するメモを入力..."
                rows={3}
              />
            </div>
          </Card>
        </section>

        {/* 7. 支払い管理 */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <LogOut size={20} className="text-indigo-600" />
            支払い管理
          </h3>
          <Card className="p-6 space-y-6">
            <div className="space-y-3">
              {project.outboundPayments && project.outboundPayments.length > 0 ? (
                project.outboundPayments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{payment.recipient}</p>
                      <p className="text-sm text-gray-500 font-medium mt-1">
                        金額: ¥{payment.amount.toLocaleString()} / 支払い予定: {payment.expectedDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {payment.isPaid ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          支払い済み
                        </span>
                      ) : (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleOutboundPaymentUpdate(payment.id, { isPaid: true })}
                          className="text-xs py-1.5"
                        >
                          支払い済みにする
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm py-4 text-center">支払い情報が登録されていません</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">備考欄</label>
              <textarea 
                value={project.outboundPaymentRemarks || ''}
                onChange={(e) => handleRemarksUpdate('outboundPaymentRemarks', e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="支払いに関するメモを入力..."
                rows={3}
              />
            </div>
          </Card>
        </section>

        {/* 関連ファイル */}
      </div>

      <Dialog 
        isOpen={!!deleteFileId} 
        onClose={() => setDeleteFileId(null)} 
        title="ファイルの削除"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <p className="text-gray-600 mb-6">このファイルを削除してもよろしいですか？</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteFileId(null)}>キャンセル</Button>
            <Button variant="danger" className="flex-1" onClick={() => { if (deleteFileId) handleDeleteFile(deleteFileId); }}>削除する</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'staff' as 'admin' | 'staff',
    remarks: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        id: user.id,
        name: user.name,
        email: user.email,
        password: '', // Don't show password
        role: user.role,
        remarks: user.remarks || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        id: '',
        name: '',
        email: '',
        password: '',
        role: 'staff',
        remarks: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingUser ? 'PUT' : 'POST';
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    
    const payload = {
      ...formData,
      id: formData.id || Date.now().toString(),
    };
    
    // If editing and password is empty, don't send it
    if (editingUser && !formData.password) {
      delete (payload as any).password;
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setIsModalOpen(false);
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || '保存に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このユーザーを削除してもよろしいですか？')) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) fetchUsers();
  };

  const handleToggleActive = async (user: User) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">ユーザー管理</h2>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <PlusCircle size={20} />
          ユーザーを追加
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">氏名</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">メールアドレス</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ロール</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ステータス</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">備考</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Clock className="animate-spin mx-auto text-indigo-600" size={24} />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    ユーザーが登録されていません
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-bold text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        user.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {user.role === 'admin' ? '管理者' : 'スタッフ'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleToggleActive(user)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold transition-all",
                          user.isActive 
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        {user.isActive ? '有効' : '一時停止中'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]">
                      {user.remarks || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(user)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <FileText size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUser ? 'ユーザーの編集' : 'ユーザーの追加'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ユーザーID (社員番号など)</label>
            <input 
              type="text" 
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="USR001"
              required
              disabled={!!editingUser}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="山田 太郎"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード {editingUser && <span className="text-[10px] text-gray-400">(変更する場合のみ入力)</span>}
            </label>
            <input 
              type="password" 
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••••"
              required={!editingUser}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ロール</label>
            <select 
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="staff">スタッフ</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea 
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="ユーザーに関するメモ..."
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>キャンセル</Button>
            <Button type="submit" className="flex-1">保存する</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'projects' | 'new' | 'detail' | 'users'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectStatus | '全て'>('全て');

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
  };

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  const handleSaveProject = async (projectData: Omit<Project, 'id'>) => {
    const id = Date.now().toString();
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...projectData, id }),
    });
    if (res.ok) {
      fetchProjects();
      setCurrentPage('projects');
    }
  };

  const handleDeleteProject = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchProjects();
    }
  };

  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <LayoutDashboard size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight">RenovaFlow</span>
          </div>
          
          <nav className="space-y-1">
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                currentPage === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              <CalendarIcon size={20} />
              <span>ダッシュボード</span>
            </button>
            <button 
              onClick={() => setCurrentPage('projects')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                currentPage === 'projects' || (currentPage === 'detail') ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              <Briefcase size={20} />
              <span>案件一覧</span>
            </button>
            <button 
              onClick={() => setCurrentPage('users')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                currentPage === 'users' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              <Users size={20} />
              <span>ユーザー管理</span>
            </button>
            <button 
              onClick={() => setCurrentPage('new')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                currentPage === 'new' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              <PlusCircle size={20} />
              <span>新規登録</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-50">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
              <UserIcon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={() => setUser(null)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut size={20} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage + (selectedProjectId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentPage === 'dashboard' && (
                <Dashboard 
                  projects={projects} 
                  onProjectClick={(id) => { setSelectedProjectId(id); setCurrentPage('detail'); }} 
                />
              )}
              {currentPage === 'projects' && (
                <ProjectList 
                  projects={projects} 
                  onProjectClick={(id) => { setSelectedProjectId(id); setCurrentPage('detail'); }}
                  onDeleteProject={handleDeleteProject}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              )}
              {currentPage === 'new' && (
                <ProjectForm onSave={handleSaveProject} />
              )}
              {currentPage === 'users' && (
                <UserManagement />
              )}
              {currentPage === 'detail' && selectedProjectId && (
                <ProjectDetail 
                  projectId={selectedProjectId} 
                  onBack={(targetTab) => {
                    if (targetTab) setActiveTab(targetTab);
                    setCurrentPage('projects');
                  }} 
                  onRefresh={fetchProjects}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
