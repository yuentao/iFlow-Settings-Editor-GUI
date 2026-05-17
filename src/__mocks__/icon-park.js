/**
 * Mock for @icon-park/vue-next
 * 在测试环境中提供图标组件 stub
 */
import { h, defineComponent } from 'vue'

function createIconStub(name) {
  return defineComponent({
    name: `Icon_${name}`,
    props: {
      size: { type: [Number, String], default: 14 },
      fill: { type: String, default: undefined },
      theme: { type: String, default: undefined },
    },
    setup(props) {
      return () => h('svg', {
        class: 'icon-stub',
        'data-icon-name': name,
        width: typeof props.size === 'number' ? `${props.size}px` : `${props.size || 14}px`,
        height: typeof props.size === 'number' ? `${props.size}px` : `${props.size || 14}px`,
        viewBox: '0 0 24 24',
        fill: props.fill || 'none',
        stroke: 'currentColor',
        strokeWidth: '2',
      })
    }
  })
}

export const Key = createIconStub('Key')
export const Server = createIconStub('Server')
export const Star = createIconStub('Star')
export const Command = createIconStub('Command')
export const Refresh = createIconStub('Refresh')
export const Loading = createIconStub('Loading')
export const Puzzle = createIconStub('Puzzle')
export const Plus = createIconStub('Plus')
export const FolderOpen = createIconStub('FolderOpen')
export const Edit = createIconStub('Edit')
export const Upload = createIconStub('Upload')
export const Delete = createIconStub('Delete')
export const Tag = createIconStub('Tag')
export const Success = createIconStub('Success')
export const Caution = createIconStub('Caution')
export const SwitchButton = createIconStub('SwitchButton')
export const SuccessPicture = createIconStub('SuccessPicture')
export const Info = createIconStub('Info')
export const Warning = createIconStub('Warning')
export const Close = createIconStub('Close')
export const Check = createIconStub('Check')
export const ArrowRight = createIconStub('ArrowRight')
export const ArrowLeft = createIconStub('ArrowLeft')
export const ArrowDown = createIconStub('ArrowDown')
export const ArrowUp = createIconStub('ArrowUp')
export const Search = createIconStub('Search')
export const Setting = createIconStub('Setting')
export const Home = createIconStub('Home')
export const Menu = createIconStub('Menu')
export const More = createIconStub('More')
export const Copy = createIconStub('Copy')
export const Share = createIconStub('Share')
export const Export = createIconStub('Export')
export const Import = createIconStub('Import')
export const Download = createIconStub('Download')
export const Application = createIconStub('Application')
export const Add = createIconStub('Add')
export const Reduce = createIconStub('Reduce')
export const Help = createIconStub('Help')
export const Question = createIconStub('Question')

const defaultExport = {
  Key, Server, Star, Command, Refresh, Loading, Puzzle,
  Plus, FolderOpen, Edit, Upload, Delete, Tag,
  Success, Caution, SwitchButton, SuccessPicture,
  Info, Warning, Close, Check, ArrowRight, ArrowLeft,
  ArrowDown, ArrowUp, Search, Setting, Home, Menu,
  More, Copy, Share, Export, Import, Download,
  Application, Add, Reduce, Help, Question,
}

export default defaultExport