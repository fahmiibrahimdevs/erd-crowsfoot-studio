import Swal from 'sweetalert2';

const isLightMode = () => document.documentElement.classList.contains('light');

// Dark / Light theme base configuration for SweetAlert2
export const getStudioSwal = () => {
  const light = isLightMode();
  return Swal.mixin({
    background: light ? '#ffffff' : '#0f172a',
    color: light ? '#0f172a' : '#f8fafc',
    buttonsStyling: false,
    width: '26rem',
    customClass: {
      popup: light
        ? '!border !border-slate-200 !rounded-2xl !shadow-2xl !bg-white !p-6 font-sans'
        : '!border !border-slate-800 !rounded-2xl !shadow-2xl !bg-slate-900 !p-6 font-sans',
      title: light
        ? '!text-slate-900 !text-base !font-bold !p-0 !m-0 !mb-1.5'
        : '!text-slate-100 !text-base !font-bold !p-0 !m-0 !mb-1.5',
      htmlContainer: light
        ? '!text-slate-600 !text-xs !leading-relaxed !p-0 !m-0 !mb-3'
        : '!text-slate-400 !text-xs !leading-relaxed !p-0 !m-0 !mb-3',
      input: light
        ? '!bg-slate-50 !border !border-slate-300 !text-slate-900 !rounded-xl !text-xs !py-2.5 !px-3.5 !focus:ring-2 !focus:ring-sky-500/30 !focus:border-sky-500 font-sans !w-full !m-0 !mt-2'
        : '!bg-slate-950 !border !border-slate-800 !text-slate-100 !rounded-xl !text-xs !py-2.5 !px-3.5 !focus:ring-2 !focus:ring-sky-500/30 !focus:border-sky-500 font-sans !w-full !m-0 !mt-2',
      validationMessage: light
        ? '!bg-rose-500/10 !border !border-rose-500/20 !text-rose-600 !rounded-xl !text-xs !p-3 !font-medium !mt-2.5 !w-full !text-left'
        : '!bg-rose-500/10 !border !border-rose-500/20 !text-rose-400 !rounded-xl !text-xs !p-3 !font-medium !mt-2.5 !w-full !text-left',
      actions: '!w-full !flex !items-center !justify-end !gap-2 !mt-5 !pt-0 !border-none',
      confirmButton: light
        ? 'px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer'
        : 'px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer',
      cancelButton: light
        ? 'px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-300 transition-all cursor-pointer'
        : 'px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition-all cursor-pointer',
      denyButton: 'px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-semibold text-xs border border-rose-500/30 transition-all cursor-pointer',
    },
  });
};

export const StudioSwal = getStudioSwal();

export interface ToastMessage {
  id: string;
  title: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;

let activeToasts: ToastMessage[] = [];
const listeners = new Set<ToastListener>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...activeToasts]));
};

export const subscribeToasts = (listener: ToastListener) => {
  listeners.add(listener);
  listener([...activeToasts]);
  return () => {
    listeners.delete(listener);
  };
};

export const removeToast = (id: string) => {
  activeToasts = activeToasts.filter((t) => t.id !== id);
  notifyListeners();
};

// Toast notification preset (Native clean Studio toast, zero backdrop blur/overlay)
export const showToast = (
  title: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'success',
  duration = 2500
) => {
  const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  const newToast: ToastMessage = { id, title, type, duration };

  // Limit max 3 active toasts
  activeToasts = [...activeToasts.slice(-2), newToast];
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
};

// Confirmation dialog preset
export const confirmDialog = async (options: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}): Promise<boolean> => {
  const light = isLightMode();
  const swalInstance = getStudioSwal();

  const result = await swalInstance.fire({
    title: options.title,
    text: options.text,
    icon: options.isDangerous ? 'warning' : 'question',
    iconColor: options.isDangerous ? '#f43f5e' : light ? '#0284c7' : '#38bdf8',
    showCancelButton: true,
    confirmButtonText: options.confirmText || 'Yes, Continue',
    cancelButtonText: options.cancelText || 'Cancel',
    reverseButtons: true,
    customClass: {
      popup: light
        ? '!border !border-slate-200 !rounded-2xl !shadow-2xl !bg-white !p-6 font-sans'
        : '!border !border-slate-800 !rounded-2xl !shadow-2xl !bg-slate-900 !p-6 font-sans',
      title: light
        ? '!text-slate-900 !text-base !font-bold !p-0 !m-0 !mb-1.5'
        : '!text-slate-100 !text-base !font-bold !p-0 !m-0 !mb-1.5',
      htmlContainer: light
        ? '!text-slate-600 !text-xs !leading-relaxed !p-0 !m-0 !mb-4'
        : '!text-slate-300 !text-xs !leading-relaxed !p-0 !m-0 !mb-4',
      actions: '!w-full !flex !items-center !justify-end !gap-2 !mt-5 !pt-0 !border-none',
      confirmButton: options.isDangerous
        ? 'px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-all shadow-md shadow-rose-500/20 cursor-pointer'
        : light
        ? 'px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer'
        : 'px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer',
      cancelButton: light
        ? 'px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-300 transition-all cursor-pointer'
        : 'px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition-all cursor-pointer',
    },
  });

  return result.isConfirmed;
};

// Prompt / Input dialog preset (SweetAlert2)
export const promptDialog = async (options: {
  title: string;
  text?: string;
  inputValue?: string;
  inputPlaceholder?: string;
  confirmText?: string;
  cancelText?: string;
  validate?: (value: string) => string | null | Promise<string | null>;
}): Promise<string | null> => {
  const light = isLightMode();
  const swalInstance = getStudioSwal();

  const result = await swalInstance.fire({
    title: options.title,
    text: options.text,
    input: 'text',
    inputValue: options.inputValue || '',
    inputPlaceholder: options.inputPlaceholder || 'Enter new name...',
    showCancelButton: true,
    confirmButtonText: options.confirmText || 'Yes, Rename',
    cancelButtonText: options.cancelText || 'Cancel',
    reverseButtons: true,
    inputValidator: (value) => {
      const trimmed = (value || '').trim();
      if (!trimmed) {
        return 'Name cannot be empty!';
      }
      if (options.validate) {
        return options.validate(trimmed);
      }
      return null;
    },
    customClass: {
      popup: light
        ? '!border !border-slate-200 !rounded-2xl !shadow-2xl !bg-white !p-6 font-sans'
        : '!border !border-slate-800 !rounded-2xl !shadow-2xl !bg-slate-900 !p-6 font-sans',
      title: light
        ? '!text-slate-900 !text-base !font-bold !p-0 !m-0 !mb-1.5'
        : '!text-slate-100 !text-base !font-bold !p-0 !m-0 !mb-1.5',
      htmlContainer: light
        ? '!text-slate-600 !text-xs !leading-relaxed !p-0 !m-0 !mb-2'
        : '!text-slate-300 !text-xs !leading-relaxed !p-0 !m-0 !mb-2',
      input: light
        ? '!bg-slate-50 !border !border-slate-300 !text-slate-900 !rounded-xl !text-xs !py-2.5 !px-3.5 !focus:ring-2 !focus:ring-sky-500/30 !focus:border-sky-500 font-sans !w-full !m-0 !mt-2'
        : '!bg-slate-950 !border !border-slate-800 !text-slate-100 !rounded-xl !text-xs !py-2.5 !px-3.5 !focus:ring-2 !focus:ring-sky-500/30 !focus:border-sky-500 font-sans !w-full !m-0 !mt-2',
      validationMessage: light
        ? '!bg-rose-500/10 !border !border-rose-500/20 !text-rose-600 !rounded-xl !text-xs !p-3 !font-medium !mt-2.5 !w-full !text-left'
        : '!bg-rose-500/10 !border !border-rose-500/20 !text-rose-400 !rounded-xl !text-xs !p-3 !font-medium !mt-2.5 !w-full !text-left',
      actions: '!w-full !flex !items-center !justify-end !gap-2 !mt-5 !pt-0 !border-none',
      confirmButton: light
        ? 'px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer'
        : 'px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer',
      cancelButton: light
        ? 'px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-300 transition-all cursor-pointer'
        : 'px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition-all cursor-pointer',
    },
  });

  if (result.isConfirmed && typeof result.value === 'string') {
    return result.value.trim();
  }
  return null;
};


