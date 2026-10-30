import type {
  BoxCategory,
  ServiceType,
  Skill,
  Technician,
  WorkOrder,
  WorkshopBox,
} from "@/domain/entities";
import { calculatePriority } from "@/domain/rules/priority";
import { addHours } from "@/shared/utils/time";

// Dados fictícios para o modo demo. Datas relativas a "agora" para a operação parecer viva.

export interface DemoState {
  skills: Skill[];
  technicians: Technician[];
  boxes: WorkshopBox[];
  workOrders: WorkOrder[];
}

const CUSTOMERS = [
  "Transportes Serra Azul",
  "Rodovale Logística",
  "TransNorte Cargas",
  "Agro Cerrado Transportes",
  "Expresso Horizonte",
  "Construtora Pedra Forte",
];

export function buildDemoState(now: Date): DemoState {
  const h = (hours: number) => addHours(now, hours);

  const skills: Skill[] = [
    { id: "sk-motor", name: "Motor", description: "Motor diesel, injeção, arrefecimento" },
    { id: "sk-trans", name: "Transmissão", description: "Caixa I-Shift, embreagem, diferencial" },
    { id: "sk-elet", name: "Elétrica", description: "Sistema elétrico e chicotes" },
    { id: "sk-diag", name: "Diagnóstico eletrônico", description: "Leitura de falhas, software, parametrização" },
    { id: "sk-freio", name: "Freios e suspensão", description: "Freio a ar, EBS, suspensão" },
    { id: "sk-hidr", name: "Hidráulica", description: "Sistemas hidráulicos e tomada de força" },
  ];

  const technicians: Technician[] = [
    { id: "t1", name: "Carlos Andrade", level: "SR", productivityScore: 92, available: true, active: true,
      skills: [{ skillId: "sk-diag", proficiency: 5, certified: true }, { skillId: "sk-motor", proficiency: 5, certified: true }, { skillId: "sk-elet", proficiency: 4, certified: false }] },
    { id: "t2", name: "Rafael Souza", level: "PLENO", productivityScore: 84, available: true, active: true,
      skills: [{ skillId: "sk-motor", proficiency: 4, certified: true }, { skillId: "sk-trans", proficiency: 3, certified: false }, { skillId: "sk-freio", proficiency: 4, certified: false }] },
    { id: "t3", name: "Marcos Lima", level: "SR", productivityScore: 88, available: true, active: true,
      skills: [{ skillId: "sk-trans", proficiency: 5, certified: true }, { skillId: "sk-hidr", proficiency: 4, certified: true }, { skillId: "sk-motor", proficiency: 3, certified: false }] },
    { id: "t4", name: "Ana Ribeiro", level: "PLENO", productivityScore: 80, available: true, active: true,
      skills: [{ skillId: "sk-elet", proficiency: 5, certified: true }, { skillId: "sk-diag", proficiency: 4, certified: false }] },
    { id: "t5", name: "Diego Ferreira", level: "JR", productivityScore: 70, available: true, active: true,
      skills: [{ skillId: "sk-freio", proficiency: 3, certified: false }, { skillId: "sk-motor", proficiency: 2, certified: false }] },
    { id: "t6", name: "Lucas Martins", level: "JR", productivityScore: 66, available: true, active: true,
      skills: [{ skillId: "sk-elet", proficiency: 2, certified: false }, { skillId: "sk-freio", proficiency: 3, certified: false }] },
    { id: "t7", name: "Paulo Costa", level: "ASSISTENTE", productivityScore: 60, available: true, active: true,
      skills: [{ skillId: "sk-freio", proficiency: 2, certified: false }, { skillId: "sk-motor", proficiency: 1, certified: false }] },
    { id: "t8", name: "Juliana Alves", level: "PLENO", productivityScore: 79, available: false, active: true,
      skills: [{ skillId: "sk-hidr", proficiency: 4, certified: true }, { skillId: "sk-trans", proficiency: 3, certified: false }] },
  ];

  const boxDefs: [string, BoxCategory][] = [
    ["B01", "DIAGNOSTICO"], ["B02", "DIAGNOSTICO"], ["B03", "GERAL"], ["B04", "GERAL"],
    ["B05", "GERAL"], ["B06", "RAPIDO"], ["B07", "RAPIDO"], ["B08", "GERAL"],
  ];
  const boxes: WorkshopBox[] = boxDefs.map(([code, category]) => ({
    id: `box-${code}`,
    code,
    category,
    status: code === "B08" ? "MAINTENANCE" : "AVAILABLE",
    currentWorkOrderId: null,
    updatedAt: h(-1),
  }));

  let seq = 0;
  const make = (o: Partial<WorkOrder> & { serviceType: ServiceType; arrivedAt: Date; estimatedHours: number }): WorkOrder => {
    seq += 1;
    const base = {
      planGold: false,
      sensitiveCargo: false,
      promisedDate: null,
      ...o,
    };
    const { priority, reason } = calculatePriority(base, o.arrivedAt);
    return {
      id: `wo-${seq}`,
      osNumber: `OS-${24000 + seq}`,
      plate: `R${String.fromCharCode(65 + (seq % 26))}${String.fromCharCode(65 + ((seq * 7) % 26))}${seq % 10}${String.fromCharCode(65 + ((seq * 3) % 26))}${(seq * 37) % 90 + 10}`,
      chassis: null,
      customerName: CUSTOMERS[seq % CUSTOMERS.length],
      requiredSkillId: null,
      partsMissing: false,
      priority,
      priorityReason: reason,
      status: "WAITING",
      assignedTechnicianId: null,
      assignedBoxId: null,
      startedAt: null,
      finishedAt: null,
      rework: false,
      updatedAt: o.arrivedAt,
      ...base,
    };
  };

  const workOrders: WorkOrder[] = [];

  // Histórico: OS concluídas nos últimos 6 dias.
  const historyServices: ServiceType[] = ["REVISAO", "CORRETIVA", "PREVENTIVA", "DIAGNOSTICO", "CORRETIVA", "DIAGNOSTICO_COMPLEXO"];
  const historyTechs = ["t1", "t2", "t3", "t4", "t5", "t2", "t3", "t1"];
  for (let i = 0; i < 24; i++) {
    const arrivedAt = h(-((i % 6) + 1) * 24 - 2 - (i % 3));
    const est = 2 + (i % 4);
    const wait = 1 + (i % 4) * 0.75;
    const startedAt = addHours(arrivedAt, wait);
    const finishedAt = addHours(startedAt, est * (0.9 + (i % 3) * 0.1));
    workOrders.push(
      make({
        serviceType: historyServices[i % historyServices.length],
        arrivedAt,
        estimatedHours: est,
        planGold: i % 5 === 0,
        promisedDate: addHours(arrivedAt, wait + est + (i % 10 === 5 ? -1 : 6)),
        status: "DONE",
        assignedTechnicianId: historyTechs[i % historyTechs.length],
        assignedBoxId: boxes[i % 7].id,
        startedAt,
        finishedAt,
        rework: i % 9 === 0,
        updatedAt: finishedAt,
      }),
    );
  }

  // Em andamento.
  const active: WorkOrder[] = [
    make({ serviceType: "DIAGNOSTICO_COMPLEXO", requiredSkillId: "sk-diag", planGold: true, arrivedAt: h(-5), estimatedHours: 6, promisedDate: h(4),
      status: "IN_PROGRESS", assignedTechnicianId: "t1", assignedBoxId: "box-B01", startedAt: h(-3), updatedAt: h(-0.2) }),
    make({ serviceType: "CORRETIVA", requiredSkillId: "sk-motor", arrivedAt: h(-6), estimatedHours: 4, promisedDate: h(6),
      status: "IN_PROGRESS", assignedTechnicianId: "t2", assignedBoxId: "box-B03", startedAt: h(-2), updatedAt: h(-50 / 60) }),
    make({ serviceType: "CORRETIVA", requiredSkillId: "sk-trans", arrivedAt: h(-20), estimatedHours: 5, promisedDate: h(1),
      status: "IN_PROGRESS", assignedTechnicianId: "t3", assignedBoxId: "box-B04", startedAt: h(-4), updatedAt: h(-0.1) }),
    make({ serviceType: "PREVENTIVA", requiredSkillId: "sk-freio", arrivedAt: h(-2), estimatedHours: 2, promisedDate: h(20),
      status: "ASSIGNED", assignedTechnicianId: "t5", assignedBoxId: "box-B06", updatedAt: h(-0.3) }),
    make({ serviceType: "DIAGNOSTICO", requiredSkillId: "sk-elet", arrivedAt: h(-26), estimatedHours: 3, promisedDate: h(2), partsMissing: true,
      status: "PAUSED", assignedTechnicianId: "t4", assignedBoxId: "box-B02", startedAt: h(-22), updatedAt: h(-0.4) }),
  ];
  workOrders.push(...active);
  for (const o of active) {
    const box = boxes.find((b) => b.id === o.assignedBoxId)!;
    box.status = "OCCUPIED";
    box.currentWorkOrderId = o.id;
    box.updatedAt = o.startedAt ?? o.updatedAt;
  }

  // Fila.
  workOrders.push(
    make({ serviceType: "REVISAO", requiredSkillId: "sk-motor", planGold: true, arrivedAt: h(-0.5), estimatedHours: 3, promisedDate: h(8) }),
    make({ serviceType: "CORRETIVA", requiredSkillId: "sk-freio", sensitiveCargo: true, arrivedAt: h(-1), estimatedHours: 4, promisedDate: h(10) }),
    make({ serviceType: "DIAGNOSTICO", requiredSkillId: "sk-elet", arrivedAt: h(-3), estimatedHours: 2.5, promisedDate: h(24) }),
    make({ serviceType: "PREVENTIVA", requiredSkillId: "sk-freio", arrivedAt: h(-1.5), estimatedHours: 2, promisedDate: h(48) }),
    make({ serviceType: "REVISAO", requiredSkillId: "sk-motor", arrivedAt: h(-4), estimatedHours: 3, promisedDate: h(30) }),
    make({ serviceType: "CORRETIVA", requiredSkillId: "sk-hidr", arrivedAt: h(-7), estimatedHours: 6, promisedDate: h(6) }),
    make({ serviceType: "DIAGNOSTICO_COMPLEXO", requiredSkillId: "sk-diag", arrivedAt: h(-2), estimatedHours: 5, promisedDate: h(36) }),
  );

  return { skills, technicians, boxes, workOrders };
}
