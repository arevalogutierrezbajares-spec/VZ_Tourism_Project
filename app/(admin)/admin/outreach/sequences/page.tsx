'use client';

import { useState } from 'react';
import {
  MessageCircle, AtSign, Mail, Plus, Trash2,
  Play, Pause, Check, ChevronRight, Zap,
} from 'lucide-react';

interface SequenceStep {
  day: number;
  channel: 'whatsapp' | 'instagram' | 'email';
  template: string;
  label: string;
}

const DEFAULT_SEQUENCE: SequenceStep[] = [
  {
    day: 1,
    channel: 'whatsapp',
    template: '¡Hola {{name}}! Somos VZ Explorer 🇻🇪 la primera plataforma de turismo digital de Venezuela. ¿Tienen un momento para conocer una oportunidad de socio fundador?',
    label: 'Primer contacto WhatsApp',
  },
  {
    day: 3,
    channel: 'instagram',
    template: '👋 Hola {{name}}! VZ Explorer quiere invitarlos como socios fundadores 🌟 ¿Les interesa saber más? ✈️',
    label: 'Seguimiento Instagram DM',
  },
  {
    day: 5,
    channel: 'email',
    template: 'Estimados en {{name}},\n\nLes escribo como seguimiento a nuestros mensajes anteriores. VZ Explorer es la primera plataforma de reservas turísticas exclusiva para Venezuela, con comisiones del 8%.\n\n¿Podemos coordinar 15 minutos esta semana?\n\nEquipo VZ Explorer',
    label: 'Email formal con propuesta',
  },
  {
    day: 8,
    channel: 'whatsapp',
    template: '¡Hola {{name}}! Último seguimiento de VZ Explorer. Tenemos cupos limitados para socios fundadores con comisiones del 8% permanentes. ¿Les interesa conversar antes del cierre?',
    label: 'Último seguimiento WhatsApp',
  },
];

function channelColor(channel: string): { bg: string; text: string; border: string } {
  if (channel === 'whatsapp') return { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' };
  if (channel === 'instagram') return { bg: '#FDF2F8', text: '#9D174D', border: '#F9A8D4' };
  return { bg: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD' };
}

function channelIcon(channel: string) {
  if (channel === 'whatsapp') return <MessageCircle className="w-4 h-4" />;
  if (channel === 'instagram') return <AtSign className="w-4 h-4" />;
  return <Mail className="w-4 h-4" />;
}

export default function SequencesPage() {
  const [steps, setSteps] = useState<SequenceStep[]>(DEFAULT_SEQUENCE);
  const [active, setActive] = useState(true);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const updateStep = (idx: number, fields: Partial<SequenceStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...fields } : s)));
  };

  const addStep = () => {
    const maxDay = Math.max(...steps.map((s) => s.day), 0);
    setSteps((prev) => [
      ...prev,
      {
        day: maxDay + 3,
        channel: 'whatsapp',
        template: '¡Hola {{name}}! Seguimiento de VZ Explorer 🇻🇪',
        label: 'Nuevo paso',
      },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <a href="/admin/outreach" className="hover:text-blue-600">Outreach</a>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Secuencias</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Editor de Secuencias</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define los pasos automáticos de outreach multi-canal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActive(!active)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors"
            style={{
              borderColor: active ? '#10B981' : '#D1D5DB',
              color: active ? '#10B981' : '#6B7280',
              background: active ? '#F0FDF4' : '#F9FAFB',
            }}
          >
            {active ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {active ? 'Secuencia activa' : 'Secuencia pausada'}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg text-white transition-colors"
            style={{ background: saved ? '#10B981' : '#3B82F6' }}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            {saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Sequence name info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <strong>founding_partner_v1</strong> — Secuencia de invitación a socios fundadores.
        Se aplica automáticamente a negocios con status <code className="bg-blue-100 px-1 rounded">scraped</code>.
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-4">
          {steps.sort((a, b) => a.day - b.day).map((step, idx) => {
            const colors = channelColor(step.channel);
            const isEditing = editingIdx === idx;

            return (
              <div key={idx} className="flex gap-4 relative">
                {/* Day bubble */}
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center z-10 border-2"
                  style={{ background: colors.bg, borderColor: colors.border }}
                >
                  <span className="text-[10px] text-gray-500">Día</span>
                  <span className="text-lg font-bold" style={{ color: colors.text }}>{step.day}</span>
                </div>

                {/* Card */}
                <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setEditingIdx(isEditing ? null : idx)}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: colors.text }}>{channelIcon(step.channel)}</span>
                      <span className="text-sm font-semibold text-gray-800">{step.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {step.channel}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove step "${step.label}" from the sequence?`)) removeStep(idx);
                        }}
                        className="text-gray-300 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 rounded transition-colors"
                        aria-label={`Remove step: ${step.label}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                            Día
                          </label>
                          <input
                            type="number"
                            value={step.day}
                            min={1}
                            onChange={(e) => updateStep(idx, { day: Number(e.target.value) })}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                            Canal
                          </label>
                          <select
                            value={step.channel}
                            onChange={(e) => updateStep(idx, { channel: e.target.value as 'whatsapp' | 'instagram' | 'email' })}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="whatsapp">WhatsApp</option>
                            <option value="instagram">Instagram DM</option>
                            <option value="email">Email</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                            Nombre del paso
                          </label>
                          <input
                            type="text"
                            value={step.label}
                            onChange={(e) => updateStep(idx, { label: e.target.value })}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                          Plantilla del mensaje
                          <span className="ml-1 text-gray-400 normal-case font-normal">(usa {'{{name}}'} para el nombre del negocio)</span>
                        </label>
                        <textarea
                          value={step.template}
                          rows={4}
                          onChange={(e) => updateStep(idx, { template: e.target.value })}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add step button */}
      <button
        onClick={addStep}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Agregar paso a la secuencia
      </button>

      {/* Run pending */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div>
            <p className="text-sm font-semibold text-amber-900">Ejecutar touchpoints pendientes</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Envía todos los pasos de la secuencia que están vencidos según los días configurados
            </p>
          </div>
          <button className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
            <Play className="w-3.5 h-3.5" />
            Ejecutar pendientes
          </button>
        </div>
      </div>
    </div>
  );
}
