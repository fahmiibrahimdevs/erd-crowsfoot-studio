import Swal from 'sweetalert2';

const isLightMode = () => document.documentElement.classList.contains('light');

// Dark / Light theme base configuration for SweetAlert2
export const getStudioSwal = () => {
  const light = isLightMode();
  return Swal.mixin({
    background: light ? '#ffffff' : '#090d16',
    color: light ? '#0f172a' : '#f1f5f9',
    buttonsStyling: false,
    width: '26rem',
    customClass: {
      container: '!backdrop-blur-md',
      popup: light
        ? '!border !border-slate-200 !rounded-2xl !shadow-2xl !bg-white/98 !p-6 font-sans'
        : '!border !border-slate-800/90 !rounded-2xl !shadow-2xl !bg-[#090d16]/98 !p-6 font-sans',
      title: light
        ? '!text-slate-900 !text-base !font-bold !p-0 !m-0 !mb-1.5'
        : '!text-slate-100 !text-base !font-bold !p-0 !m-0 !mb-1.5',
      htmlContainer: light
        ? '!text-slate-500 !text-xs !leading-relaxed !p-0 !m-0 !mb-3'
        : '!text-slate-400 !text-xs !leading-relaxed !p-0 !m-0 !mb-3',
      input: light
        ? '!bg-slate-50 !border !border-slate-300 !text-slate-900 !rounded-xl !text-xs !py-2.5 !px-3.5 !focus:ring-2 !focus:ring-sky-500/30 !focus:border-sky-500 font-sans !w-full !m-0 !mt-2'
        : '!bg-slate-950/90 !border !border-slate-800 !text-slate-100 !rounded-xl !text-xs !py-2.5 !px-3.5 !focus:ring-2 !focus:ring-sky-500/30 !focus:border-sky-500 font-sans !w-full !m-0 !mt-2',
      validationMessage: light
        ? '!bg-rose-500/10 !border !border-rose-500/20 !text-rose-600 !rounded-xl !text-xs !p-3 !font-medium !mt-2.5 !w-full !text-left'
        : '!bg-rose-500/10 !border !border-rose-500/20 !text-rose-400 !rounded-xl !text-xs !p-3 !font-medium !mt-2.5 !w-full !text-left',
      actions: '!w-full !flex !items-center !justify-end !gap-2 !mt-5 !pt-0 !border-none',
      confirmButton: light
        ? 'px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer'
        : 'px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer',
      cancelButton: light
        ? 'px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-300 transition-all cursor-pointer'
        : 'px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/80 transition-all cursor-pointer',
      denyButton: 'px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-semibold text-xs border border-rose-500/30 transition-all cursor-pointer',
    },
  });
};

export const StudioSwal = getStudioSwal();

// Toast notification preset
export const showToast = (title: string, icon: 'success' | 'info' | 'warning' | 'error' = 'success') => {
  const light = isLightMode();
  const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    background: light ? '#ffffff' : '#090d16',
    color: light ? '#0f172a' : '#f8fafc',
    customClass: {
      popup: light
        ? '!border !border-slate-200 !rounded-xl !shadow-xl !bg-white/95 !backdrop-blur-md !px-4 !py-3 font-sans !m-4'
        : '!border !border-slate-800 !rounded-xl !shadow-xl !bg-slate-900/95 !backdrop-blur-md !px-4 !py-3 font-sans !m-4',
      title: light
        ? '!text-slate-800 !text-xs !font-semibold'
        : '!text-slate-200 !text-xs !font-semibold',
    },
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

  Toast.fire({
    icon,
    title,
  });
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
    confirmButtonText: options.confirmText || 'Ya, Lanjutkan',
    cancelButtonText: options.cancelText || 'Batal',
    reverseButtons: true,
    customClass: {
      popup: light
        ? '!border !border-slate-200 !rounded-2xl !shadow-2xl !bg-white/98 !p-6 font-sans'
        : '!border !border-slate-800/90 !rounded-2xl !shadow-2xl !bg-[#090d16]/98 !p-6 font-sans',
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
        : 'px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/80 transition-all cursor-pointer',
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
    inputPlaceholder: options.inputPlaceholder || 'Masukkan nama baru...',
    showCancelButton: true,
    confirmButtonText: options.confirmText || 'Ya, Ubah',
    cancelButtonText: options.cancelText || 'Batal',
    reverseButtons: true,
    inputValidator: (value) => {
      const trimmed = (value || '').trim();
      if (!trimmed) {
        return 'Nama tidak boleh kosong!';
      }
      if (options.validate) {
        return options.validate(trimmed);
      }
      return null;
    },
    customClass: {
      popup: light
        ? '!border !border-slate-200 !rounded-2xl !shadow-2xl !bg-white/98 !p-6 font-sans'
        : '!border !border-slate-800/90 !rounded-2xl !shadow-2xl !bg-[#090d16]/98 !p-6 font-sans',
      title: light
        ? '!text-slate-900 !text-base !font-bold !p-0 !m-0 !mb-1.5'
        : '!text-slate-100 !text-base !font-bold !p-0 !m-0 !mb-1.5',
      htmlContainer: light
        ? '!text-slate-600 !text-xs !leading-relaxed !p-0 !m-0 !mb-2'
        : '!text-slate-300 !text-xs !leading-relaxed !p-0 !m-0 !mb-2',
      input: light
        ? '!bg-slate-50 !border !border-slate-300 !text-slate-900 !rounded-xl !text-xs !py-2.5 !px-3.5 !focus:ring-2 !focus:ring-sky-500/30 !focus:border-sky-500 font-sans !w-full !m-0 !mt-2'
        : '!bg-slate-950/90 !border !border-slate-800 !text-slate-100 !rounded-xl !text-xs !py-2.5 !px-3.5 !focus:ring-2 !focus:ring-sky-500/30 !focus:border-sky-500 font-sans !w-full !m-0 !mt-2',
      validationMessage: light
        ? '!bg-rose-500/10 !border !border-rose-500/20 !text-rose-600 !rounded-xl !text-xs !p-3 !font-medium !mt-2.5 !w-full !text-left'
        : '!bg-rose-500/10 !border !border-rose-500/20 !text-rose-400 !rounded-xl !text-xs !p-3 !font-medium !mt-2.5 !w-full !text-left',
      actions: '!w-full !flex !items-center !justify-end !gap-2 !mt-5 !pt-0 !border-none',
      confirmButton: light
        ? 'px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer'
        : 'px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer',
      cancelButton: light
        ? 'px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-300 transition-all cursor-pointer'
        : 'px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/80 transition-all cursor-pointer',
    },
  });

  if (result.isConfirmed && typeof result.value === 'string') {
    return result.value.trim();
  }
  return null;
};

