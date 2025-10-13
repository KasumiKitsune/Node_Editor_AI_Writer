// FIX: Removed a self-referential import of `KeyValueField` that was causing a name conflict with the interface declared within this same file.
export enum NodeType {
  PLOT = 'PLOT',
  CHARACTER = 'CHARACTER',
  SETTING = 'SETTING',
  STYLE = 'STYLE',
  STRUCTURE = 'STRUCTURE',
  WORK = 'WORK',
  ENVIRONMENT = 'ENVIRONMENT',
}

export enum PlotCategory {
  RELATIONSHIPS = '关系与情感',
  POWER = '权力、野心与越轨',
  SURVIVAL = '生存、苦难与救赎',
  DISCOVERY = '发现与认知',
  OTHER = '其他',
}

export enum StyleCategory {
  GENRE = '内容题材',
  NARRATIVE_METHOD = '叙事方式',
  PROSE_STYLE = '语言文风',
  NARRATIVE_STANCE = '叙事态度',
  TONE_MOOD = '基调/氛围',
}

export enum StructureCategory {
  STARTING = '小说的开头类型',
  ENDING = '小说的结尾类型',
}

export interface Plot {
  id: number;
  name: string;
  category: PlotCategory;
  description: string;
}

export interface Style {
  id: number;
  name: string;
  category: StyleCategory;
  description: string;
}

export interface StructurePlot {
  id: number;
  name: string;
  category: StructureCategory;
  description: string;
}

export interface KeyValueField {
  id: string;
  key: string;
  value: string;
}

export interface PlotNodeData {
  plotId: number;
  title: string;
  description: string;
  userInput?: string;
}

export interface CharacterNodeData {
  title: string;
  fields: KeyValueField[];
}

export interface SettingNodeData {
  title: string;
  fields: KeyValueField[];
  narrativeStructure: 'single' | 'dual' | 'light_dark';
}

export interface EnvironmentNodeData {
  title: string;
  fields: KeyValueField[];
}

export interface StyleNodeData {
    styleId: number;
    title: string;
    description: string;
    applicationMethod: 'appropriate' | 'full_section';
}

export interface StructureNodeData {
  structureId: number;
  title: string;
  description: string;
  category: StructureCategory;
  userInput?: string;
}

export interface WorkNodeData {
    title: string;
    content: string;
    mode: 'rewrite' | 'continue' | 'parody';
    parodyLevel?: 'reference' | 'imitation' | '套作';
}

export type NodeData = PlotNodeData | CharacterNodeData | SettingNodeData | StyleNodeData | StructureNodeData | WorkNodeData | EnvironmentNodeData;

export interface Node<T = NodeData> {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: T;
  isCollapsed?: boolean;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Chapter {
  chapter_number: number;
  chapter_title: string;
  key_events: string[];
  point_of_view?: string;
  setting?: string;
}

export interface StorySegment {
  segment_title: string;
  chapters?: Chapter[];
  key_events?: string[];
  estimated_word_count: number;
}

export interface StructuredOutline {
  title: string;
  segments: StorySegment[];
}
