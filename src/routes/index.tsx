import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home, Layers, Image as ImageIcon, Square, Sofa, Sparkles,
  Monitor, Tablet, Smartphone, Eye, Moon, Download,
  AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  Pencil, Minus, Plus, Type, Search, Settings, ChevronDown, Lock, Unlock,
} from "lucide-react";
import { FloorPlan } from "@/components/FloorPlan";

export const Route = createFileRoute("/")({
  component: Index,
});

const elements = [
  { name: "Sofa", icon: Sofa },
  { name: "Cupboard", icon: Square },
  { name: "Bed", icon: Square, active: true },
  { name: "Mirror", icon: Square },
  { name: "Chair", icon: Square },
  { name: "Flower Pot", icon: Sparkles },
  { name: "Pillow", icon: Square },
  { name: "Lamp", icon: Sparkles },
  { name: "Wardrobe", icon: Square },
];

function Index() {
  const [tab, setTab] = useState<"Elements" | "Resources">("Elements");

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto flex h-[calc(100vh-2rem)] max-w-[1480px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Home className="h-4 w-4" />
              <span>Archy.</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm">
              <span className="grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3" />
              </span>
              <span className="font-medium">Cansaas Agency</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border p-1">
            <button className="rounded-md p-1.5 hover:bg-secondary"><Monitor className="h-4 w-4" /></button>
            <button className="rounded-md p-1.5 hover:bg-secondary"><Tablet className="h-4 w-4" /></button>
            <button className="rounded-md p-1.5 hover:bg-secondary"><Smartphone className="h-4 w-4" /></button>
            <div className="mx-1 h-5 w-px bg-border" />
            <span className="px-2 font-mono text-xs text-muted-foreground">1440×1024 px</span>
            <div className="mx-1 h-5 w-px bg-border" />
            <span className="px-2 font-mono text-xs text-muted-foreground">64 %</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-md p-2 hover:bg-secondary"><Eye className="h-4 w-4" /></button>
            <button className="rounded-md p-2 hover:bg-secondary"><Moon className="h-4 w-4" /></button>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Far-left icon rail */}
          <nav className="flex w-12 flex-col items-center gap-1 border-r border-border py-3">
            {[Layers, ImageIcon, Square, Sofa, Monitor, Sparkles].map((Icon, i) => (
              <button key={i} className={`rounded-md p-2 ${i===0 ? "bg-secondary" : "hover:bg-secondary"}`}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
            <div className="mt-auto">
              <button className="rounded-md p-2 hover:bg-secondary"><Settings className="h-4 w-4" /></button>
              <div className="mt-2 h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent" />
            </div>
          </nav>

          {/* Left panel */}
          <aside className="flex w-64 flex-col border-r border-border">
            <div className="border-b border-border p-4">
              <div className="text-sm font-semibold">House Plan</div>
              <div className="mt-3 flex rounded-lg bg-secondary p-1 text-sm">
                {(["Elements","Resources"] as const).map(t => (
                  <button key={t} onClick={()=>setTab(t)}
                    className={`flex-1 rounded-md py-1 ${tab===t ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">All Element</div>
              <ul className="space-y-1">
                {elements.map((el) => (
                  <li key={el.name}>
                    <button className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${el.active ? "bg-secondary font-medium" : "hover:bg-secondary"}`}>
                      <span className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card">
                        <el.icon className="h-3.5 w-3.5" />
                      </span>
                      {el.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-1.5 text-sm">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input placeholder="Search..." className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
                <kbd className="rounded bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘ F</kbd>
              </div>
            </div>
          </aside>

          {/* Canvas */}
          <main className="relative flex-1 overflow-hidden bg-canvas">
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="h-full w-full max-w-5xl rounded-xl bg-card shadow-sm ring-1 ring-border overflow-hidden">
                <FloorPlan />
              </div>
            </div>

            {/* Bottom toolbar */}
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5 shadow-lg">
              <button className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Pencil className="h-4 w-4" />
              </button>
              <button className="rounded-lg p-2 hover:bg-secondary"><Minus className="h-4 w-4" /></button>
              <button className="rounded-lg p-2 hover:bg-secondary"><Square className="h-4 w-4" /></button>
              <button className="rounded-lg p-2 hover:bg-secondary"><Type className="h-4 w-4" /></button>
              <div className="mx-1 h-5 w-px bg-border" />
              <button className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs hover:bg-secondary">
                <Search className="h-3.5 w-3.5" /> 934.55 cm
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </main>

          {/* Right panel */}
          <aside className="flex w-72 flex-col overflow-y-auto border-l border-border">
            <Section title="Canvas Information">
              <Row label="Name">
                <input defaultValue="Living Room" className="w-full rounded-md border border-border bg-card px-2 py-1 text-sm" />
              </Row>
              <Row label="Background">
                <div className="flex w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-sm">
                  <span className="h-3.5 w-3.5 rounded bg-[#1B1A1A]" />
                  <span className="flex-1 font-mono text-xs">#1B1A1A</span>
                  <span className="text-xs text-muted-foreground">70 %</span>
                </div>
              </Row>
            </Section>

            <Section title="Modify">
              <Row label="Align">
                <div className="flex w-full items-center justify-between gap-1">
                  {[AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd].map((I, i) => (
                    <button key={i} className="rounded p-1.5 hover:bg-secondary"><I className="h-3.5 w-3.5" /></button>
                  ))}
                </div>
              </Row>
              <Row label="Position">
                <div className="grid w-full grid-cols-2 gap-1.5">
                  <NumField v="530" suffix="x" />
                  <NumField v="60" suffix="y" />
                </div>
              </Row>
              <Row label="Radius">
                <div className="grid w-full grid-cols-3 gap-1.5">
                  <NumField v="0" /><NumField v="0" /><NumField v="0" />
                </div>
              </Row>
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2">
                  <input type="range" defaultValue={0} className="flex-1 accent-primary" />
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">0°</span>
                </div>
              </div>
            </Section>

            <Section title="Style">
              <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">Texture</div>
              <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-border p-2">
                <div className="h-9 w-9 rounded-md bg-gradient-to-br from-[oklch(0.85_0.06_152)] to-[oklch(0.7_0.08_152)]" />
                <div className="flex-1 text-xs">
                  <div className="font-medium">Fabric Wave Texture</div>
                  <div className="text-muted-foreground">Green Pattern</div>
                </div>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Row label="Opacity">
                <div className="flex w-full items-center gap-2">
                  <input type="range" defaultValue={60} className="flex-1 accent-primary" />
                  <span className="font-mono text-xs">60%</span>
                </div>
              </Row>
              <Row label="Stroke">
                <div className="flex w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs">
                  <span className="h-3 w-3 rounded bg-[#EBEBEB] border border-border" />
                  <span className="flex-1 font-mono">#EBEBEB</span>
                  <span className="text-muted-foreground">1 px</span>
                </div>
              </Row>
            </Section>

            <div className="p-3">
              <button className="w-full rounded-lg border border-border bg-card py-2 text-sm font-medium hover:bg-secondary">
                View Product Details
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-3">
      <div className="flex items-center justify-between px-3 pb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <div className="w-20 shrink-0 text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}

function NumField({ v, suffix }: { v: string; suffix?: string }) {
  return (
    <div className="flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs">
      <input defaultValue={v} className="w-full bg-transparent outline-none" />
      {suffix && <span className="text-muted-foreground">{suffix}</span>}
    </div>
  );
}
