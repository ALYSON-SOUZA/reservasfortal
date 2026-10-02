import React from 'react';
import { Reservation } from '../types';
import { formatDateBR } from '../utils/dateUtils';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  reservation,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !reservation) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#252A34]/70 backdrop-blur-xs flex items-center justify-center p-4 font-dm">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#252A34]/20 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FF2E63]/15 text-[#FF2E63] mx-auto flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-[#7D1416] font-raleway mb-2">
            Confirmar Exclusão da Reserva
          </h3>

          <p className="text-sm text-[#252A34]/80 mb-4">
            Tem certeza de que deseja excluir o agendamento da{' '}
            <strong className="text-[#252A34] font-bold">{reservation.sala}</strong> marcado para{' '}
            <strong className="text-[#AD2F3B] font-bold">{formatDateBR(reservation.dia)}</strong> ({reservation.horaInicial} às {reservation.horaFinal})?
          </p>

          <div className="bg-[#EAEAEA]/50 p-4 rounded-2xl border border-[#252A34]/15 text-left text-xs text-[#252A34] mb-6 space-y-1.5 font-medium">
            <div><strong className="text-[#252A34]">Solicitante:</strong> {reservation.solicitante}</div>
            <div><strong className="text-[#252A34]">Setor:</strong> {reservation.setor}</div>
            <div><strong className="text-[#252A34]">Chamado GLPI:</strong> #{reservation.glpi}</div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              id="btn-cancelar-exclusao"
              onClick={onClose}
              className="w-1/2 px-4 py-2.5 rounded-xl border-2 border-slate-300 text-[#252A34] hover:bg-slate-100 text-sm font-bold font-dm transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-confirmar-exclusao"
              onClick={onConfirm}
              className="w-1/2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white text-sm font-bold font-raleway tracking-wide transition shadow-lg shadow-[#FF2E63]/30 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sim, Excluir</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
