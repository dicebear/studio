import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SidebarItem } from '@/components/SidebarItem';
import { useAppStore, type StageKind } from '@/store';
import { Section } from '@/components/Section';
import { ColorGroupPanel } from './components/ColorGroupPanel';
import { ComponentGroupPanel } from './components/ComponentGroupPanel';
import { GeneralForm } from './components/GeneralForm';
import { LicenseForm } from './components/LicenseForm';

function MenuItem({
  kind,
  name = '',
  alias,
  children,
}: {
  kind: StageKind;
  name?: string;
  alias?: boolean;
  children: string;
}) {
  const stage = useAppStore((state) => state.style.stage);
  const setStage = useAppStore((state) => state.setStage);
  const active = stage.kind === kind && stage.name === name;

  return (
    <SidebarItem
      active={active}
      className={cn(
        'h-7 truncate px-2',
        alias && 'pl-5 text-muted-foreground before:mr-1.5 before:opacity-60 before:content-["↳"]',
      )}
      onClick={() => setStage(kind, name)}
    >
      {children}
    </SidebarItem>
  );
}

export function StyleSidebar() {
  const data = useAppStore((state) => state.style.data)!;

  const componentEntries = useMemo(() => {
    const entries = Object.entries(data.components);
    const aliasesBySource = new Map<string, string[]>();

    for (const [name, group] of entries) {
      if (group.extendsGroup) {
        aliasesBySource.set(group.extendsGroup, [...(aliasesBySource.get(group.extendsGroup) ?? []), name]);
      }
    }

    const result: { name: string; alias: boolean }[] = [];

    for (const [name] of entries.filter(([, g]) => !g.extendsGroup).sort(([a], [b]) => a.localeCompare(b))) {
      result.push({ name, alias: false });

      for (const alias of (aliasesBySource.get(name) ?? []).sort()) {
        result.push({ name: alias, alias: true });
      }
    }

    return result;
  }, [data.components]);

  const usedColorGroups = useMemo(
    () => Object.keys(data.colors).filter((name) => data.colors[name].isUsedByComponents),
    [data.colors],
  );

  return (
    <>
      <Section gap="tight" title="Frame">
        <MenuItem kind="general">General</MenuItem>
        <MenuItem kind="license">License</MenuItem>
      </Section>
      {componentEntries.length > 0 && (
        <Section gap="tight" title="Components">
          {componentEntries.map((entry) => (
            <MenuItem key={entry.name} kind="component" name={entry.name} alias={entry.alias}>
              {entry.name}
            </MenuItem>
          ))}
        </Section>
      )}
      {usedColorGroups.length > 0 && (
        <Section gap="tight" title="Colors">
          {usedColorGroups.map((name) => (
            <MenuItem key={name} kind="color" name={name}>
              {name}
            </MenuItem>
          ))}
        </Section>
      )}
    </>
  );
}

/** The form for the part of the style the sidebar picked. */
export function StyleStage() {
  const data = useAppStore((state) => state.style.data)!;
  const stage = useAppStore((state) => state.style.stage);

  return (
    <div key={`${stage.kind}:${stage.name}`} className="p-4">
      {stage.kind === 'component' && data.components[stage.name] ? (
        <ComponentGroupPanel group={stage.name} />
      ) : stage.kind === 'color' && data.colors[stage.name] ? (
        <ColorGroupPanel group={stage.name} />
      ) : stage.kind === 'license' ? (
        <LicenseForm />
      ) : (
        <GeneralForm />
      )}
    </div>
  );
}
