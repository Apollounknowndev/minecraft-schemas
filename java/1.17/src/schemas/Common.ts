import {
  StringNode as RawStringNode,
  ObjectNode,
  MapNode,
  ListNode,
  NumberNode,
  ChoiceNode,
  Reference as RawReference,
  INode,
  SchemaRegistry,
  CollectionRegistry,
  NestedNodeChildren,
  BooleanNode,
  ObjectOrPreset,
  Opt,
  Mod,
} from '@mcschema/core'

export let ConditionCases: (entitySourceNode?: INode<any>) => NestedNodeChildren
export let FunctionCases: (conditions: NestedNodeChildren, copySourceNode?: INode<any>, entitySourceNode?: INode<any>) => NestedNodeChildren

export const DefaultDimensionType = {
  ultrawarm: false,
  natural: true,
  piglin_safe: false,
  respawn_anchor_works: false,
  bed_works: true,
  has_raids: true,
  has_skylight: true,
  has_ceiling: false,
  coordinate_scale: 1,
  ambient_light: 0,
  logical_height: 256,
  infiniburn: 'minecraft:infiniburn_overworld',
}
export let DimensionTypePresets: (node: INode<any>) => INode<any>

export const DefaultNoiseSettings = {
  name: 'minecraft:overworld',
  bedrock_roof_position: -10,
  bedrock_floor_position: 0,
  sea_level: 63,
  disable_mob_generation: false,
  noise: {
    density_factor: 1,
    density_offset: -0.46875,
    simplex_surface_noise: true,
    random_density_offset: true,
    island_noise_override: false,
    amplified: false,
    size_horizontal: 1,
    size_vertical: 2,
    height: 256,
    sampling: {
      xz_scale: 1,
      y_scale: 1,
      xz_factor: 80,
      y_factor: 160
    },
    top_slide: {
      target: -10,
      size: 3,
      offset: 0
    },
    bottom_slide: {
      target: -30,
      size: 0,
      offset: 0
    }
  },
  default_block: {
    Name: "minecraft:stone"
  },
  default_fluid: {
    Name: "minecraft:water",
    Properties: {
      level: "0"
    }
  }
}
export let NoiseSettingsPresets: (node: INode) => INode

type RangeConfig = {
  /** Whether only integers are allowed */
  integer?: boolean
  /** If specified, number will be capped at this minimum */
  min?: number
  /** If specified, number will be capped at this maximum */
  max?: number
  /** Whether binomials are allowed */
  allowBinomial?: boolean
  /** If true, only ranges are allowed */
  forceRange?: boolean
  /** If true, min and max are both required */
  bounds?: boolean
}
export let Range: (config?: RangeConfig) => INode

type UniformIntConfig = {
  min?: number
  max?: number
  maxSpread?: number
}
export let UniformInt: (config?: UniformIntConfig) => INode

export function initCommonSchemas(schemas: SchemaRegistry, collections: CollectionRegistry) {
  const StringNode = RawStringNode.bind(undefined, collections)
  const Reference = RawReference.bind(undefined, schemas)

  schemas.register('block_state', Mod(ObjectNode({
    Name: StringNode({ validator: 'resource', params: { pool: 'block' } }),
    Properties: Opt(MapNode(
      StringNode(),
      StringNode(),
      { validation: { validator: 'block_state_map', params: { id: ['pop', { push: 'Name' }] } } }
    ))
  }, { context: 'block_state' }), {
    default: () => ({  
      Name: 'minecraft:stone'
    })
  }))

  schemas.register('fluid_state', Mod(ObjectNode({
    Name: StringNode({ validator: 'resource', params: { pool: 'fluid' } }),
    Properties: Opt(MapNode(
      StringNode(),
      StringNode()
    ))
  }, { context: 'fluid_state' }), {
    default: () => ({
      Name: 'minecraft:water',
      Properties: {
        'level': '0'
      }
    })
  }))

  schemas.register('block_pos', Mod(ListNode(
    NumberNode({ integer: true })
  ), {
    default: () => [0, 0, 0]
  }))

  Range = (config?: RangeConfig) => ChoiceNode([
    ...(config?.forceRange ? [] : [{
      type: 'number',
      node: NumberNode(config),
      change: (v: any) => v === undefined ? 0 : v.min ?? v.max ?? v.n ?? 0
    }]),
    {
      type: 'object',
      priority: -1,
      node: ObjectNode({
        min: config?.bounds ? NumberNode(config) : Opt(NumberNode(config)),
        max: config?.bounds ? NumberNode(config) : Opt(NumberNode(config))
      }, { context: 'range' }),
      change: (v: any) => ({
        min: typeof v === 'number' ? v : v === undefined ? 1 : v.n,
        max: typeof v === 'number' ? v : v === undefined ? 1 : v.n
      })
    },
    ...(config?.allowBinomial ? [{
      type: 'binomial',
      node: ObjectNode({
        type: StringNode({enum: ['minecraft:binomial'] }),
        n: NumberNode({ integer: true, min: 0 }),
        p: NumberNode({ min: 0, max: 1 })
      }, { context: 'range' }),
      match: (v: any) => v !== undefined && v.type === 'minecraft:binomial',
      change: (v: any) => ({
        type: 'minecraft:binomial',
        n: typeof v === 'number' ? v : v === undefined ? 1 : (v.min ?? v.max ?? 1),
        p: 0.5
      })
    }] : [])
  ], { choiceContext: 'range' })

  UniformInt = (config?: UniformIntConfig) => ChoiceNode([
    {
      type: 'number',
      node: NumberNode({ integer: true, min: config?.min, max: config?.max }),
      change: v => v.base
    },
    {
      type: 'object',
      node: ObjectNode({
        base: NumberNode({ integer: true, min: config?.min, max: config?.max }),
        spread: NumberNode({ integer: true, min: 0, max: config?.maxSpread })
      }),
      change: v => ({
        base: v,
        spread: 0
      })
    }
  ], { context: 'uniform_int' })

  ConditionCases = (entitySourceNode: INode<any> = StringNode({ enum: 'entity_source' })) => ({
    'minecraft:alternative': {
      terms: ListNode(
        Reference('condition')
      )
    },
    'minecraft:block_state_property': {
      block: StringNode({ validator: 'resource', params: { pool: 'block' } }),
      properties: MapNode(
        StringNode(),
        StringNode(),
        { validation: { validator: 'block_state_map', params: { id: ['pop', { push: 'block' }] } } }
      )
    },
    'minecraft:damage_source_properties': {
      predicate: Reference('damage_source_predicate')
    },
    'minecraft:entity_properties': {
      entity: entitySourceNode,
      predicate: Reference('entity_predicate')
    },
    'minecraft:entity_scores': {
      entity: entitySourceNode,
      scores: MapNode(
        StringNode({ validator: 'objective' }),
        Range({ forceRange: true })
      )
    },
    'minecraft:inverted': {
      term: Reference('condition')
    },
    'minecraft:killed_by_player': {
      inverse: Opt(BooleanNode())
    },
    'minecraft:location_check': {
      offsetX: Opt(NumberNode({ integer: true })),
      offsetY: Opt(NumberNode({ integer: true })),
      offsetZ: Opt(NumberNode({ integer: true })),
      predicate: Reference('location_predicate')
    },
    'minecraft:match_tool': {
      predicate: Reference('item_predicate')
    },
    'minecraft:random_chance': {
      chance: NumberNode({ min: 0, max: 1 })
    },
    'minecraft:random_chance_with_looting': {
      chance: NumberNode({ min: 0, max: 1 }),
      looting_multiplier: NumberNode()
    },
    'minecraft:requirements': {
      terms: ListNode(
        Reference('condition')
      ),
    },
    'minecraft:reference': {
      name: StringNode({ validator: 'resource', params: { pool: '$predicate' } })
    },
    'minecraft:table_bonus': {
      enchantment: StringNode({ validator: 'resource', params: { pool: 'enchantment' } }),
      chances: ListNode(
        NumberNode({ min: 0, max: 1 })
      )
    },
    'minecraft:time_check': {
      value: Range(),
      period: Opt(NumberNode())
    },
    'minecraft:weather_check': {
      raining: Opt(BooleanNode()),
      thundering: Opt(BooleanNode())
    }
  })

  FunctionCases = (conditions: NestedNodeChildren, copySourceNode: INode<any> = StringNode({ enum: 'copy_source' }), entitySourceNode: INode<any> = StringNode({ enum: 'entity_source' })) => ({
    'minecraft:apply_bonus': {
      enchantment: StringNode({ validator: 'resource', params: { pool: 'enchantment' } }),
      formula: StringNode({ validator: 'resource', params: { pool: collections.get('loot_table_apply_bonus_formula') } }),
      parameters: Mod(ObjectNode({
        bonusMultiplier: Mod(NumberNode(), {
          enabled: path => path.pop().push('formula').get() === 'minecraft:uniform_bonus_count'
        }),
        extra: Mod(NumberNode(), {
          enabled: path => path.pop().push('formula').get() === 'minecraft:binomial_with_bonus_count'
        }),
        probability: Mod(NumberNode(), {
          enabled: path => path.pop().push('formula').get() === 'minecraft:binomial_with_bonus_count'
        })
      }), {
        enabled: path => path.push('formula').get() !== 'minecraft:ore_drops'
      }),
      ...conditions
    },
    'minecraft:copy_name': {
      source: copySourceNode,
      ...conditions
    },
    'minecraft:copy_nbt': {
      source: copySourceNode,
      ops: ListNode(
        ObjectNode({
          source: StringNode({ validator: 'nbt_path', params: { category: { getter: 'copy_source', path: ['pop', 'pop', 'pop', { push: 'source' }] } } }),
          target: StringNode({ validator: 'nbt_path', params: { category: 'minecraft:item' } }),
          op: StringNode({ enum: ['replace', 'append', 'merge'] })
        }, { context: 'nbt_operation' })
      ),
      ...conditions
    },
    'minecraft:copy_state': {
      block: StringNode({ validator: 'resource', params: { pool: 'block' } }),
      properties: ListNode(
        StringNode({ validator: 'block_state_key', params: { id: ['pop', 'pop', { push: 'block' }] } })
      ),
      ...conditions
    },
    'minecraft:enchant_randomly': {
      enchantments: Opt(ListNode(
        StringNode({ validator: 'resource', params: { pool: 'enchantment' } })
      )),
      ...conditions
    },
    'minecraft:enchant_with_levels': {
      levels: Range({ allowBinomial: true }),
      treasure: Opt(BooleanNode()),
      ...conditions
    },
    'minecraft:exploration_map': {
      destination: Opt(StringNode({ validator: 'resource', params: { pool: 'worldgen/structure_feature' } })),
      decoration: Opt(StringNode({ enum: 'map_decoration' })),
      zoom: Opt(NumberNode({ integer: true })),
      search_radius: Opt(NumberNode({ integer: true })),
      skip_existing_chunks: Opt(BooleanNode()),
      ...conditions
    },
    'minecraft:fill_player_head': {
      entity: entitySourceNode,
      ...conditions
    },
    'minecraft:limit_count': {
      limit: Range({ bounds: true }),
      ...conditions
    },
    'minecraft:looting_enchant': {
      count: Range({ bounds: true }),
      limit: Opt(NumberNode({ integer: true })),
      ...conditions
    },
    'minecraft:set_attributes': {
      modifiers: ListNode(
        Reference('attribute_modifier')
      ),
      ...conditions
    },
    'minecraft:set_banner_pattern': {
      patterns: ListNode(
        ObjectNode({
          pattern: StringNode({ enum: 'banner_pattern' }),
          color: StringNode({ enum: 'dye_color' })
        })
      ),
      append: Opt(BooleanNode()),
      ...conditions
    },
    'minecraft:set_contents': {
      entries: ListNode(
        Reference('loot_entry')
      ),
      ...conditions
    },
    'minecraft:set_count': {
      count: Range({ allowBinomial: true }),
      ...conditions
    },
    'minecraft:set_damage': {
      damage: Range({ forceRange: true }),
      ...conditions
    },
    'minecraft:set_loot_table': {
      name: StringNode({ validator: 'resource', params: { pool: '$loot_table' } }),
      seed: Opt(NumberNode({ integer: true }))
    },
    'minecraft:set_lore': {
      entity: Opt(entitySourceNode),
      lore: ListNode(
        Reference('text_component')
      ),
      replace: Opt(BooleanNode()),
      ...conditions
    },
    'minecraft:set_name': {
      entity: Opt(entitySourceNode),
      name: Opt(Reference('text_component')),
      ...conditions
    },
    'minecraft:set_nbt': {
      tag: StringNode({ validator: 'nbt', params: { registry: { category: 'minecraft:item' } } }),
      ...conditions
    },
    'minecraft:set_stew_effect': {
      effects: Opt(ListNode(
        ObjectNode({
          type: StringNode({ validator: 'resource', params: { pool: 'mob_effect' } }),
          duration: Range()
        })
      )),
      ...conditions
    }
  })

  DimensionTypePresets = (node: INode<any>) => ObjectOrPreset(
    StringNode({ validator: 'resource', params: { pool: '$dimension_type' } }),
    node,
    {
      'minecraft:overworld': DefaultDimensionType,
      'minecraft:the_nether': {
        name: 'minecraft:the_nether',
        ultrawarm: true,
        natural: false,
        shrunk: true,
        piglin_safe: true,
        respawn_anchor_works: true,
        bed_works: false,
        has_raids: false,
        has_skylight: false,
        has_ceiling: true,
        ambient_light: 0.1,
        fixed_time: 18000,
        logical_height: 128,
        effects: 'minecraft:the_nether',
        infiniburn: 'minecraft:infiniburn_nether',
      },
      'minecraft:the_end': {
        name: 'minecraft:the_end',
        ultrawarm: false,
        natural: false,
        shrunk: false,
        piglin_safe: false,
        respawn_anchor_works: false,
        bed_works: false,
        has_raids: true,
        has_skylight: false,
        has_ceiling: false,
        ambient_light: 0,
        fixed_time: 6000,
        logical_height: 256,
        effects: 'minecraft:the_end',
        infiniburn: 'minecraft:infiniburn_end',
      }
    }
  )
  
  NoiseSettingsPresets = (node: INode<any>) => ObjectOrPreset(
    StringNode({ validator: 'resource', params: { pool: '$worldgen/noise_settings' } }),
    node,
    {
      'minecraft:overworld': DefaultNoiseSettings,
      'minecraft:nether': {
        name: 'minecraft:nether',
        bedrock_roof_position: 0,
        bedrock_floor_position: 0,
        sea_level: 32,
        disable_mob_generation: true,
        noise: {
          density_factor: 0,
          density_offset: 0.019921875,
          simplex_surface_noise: false,
          random_density_offset: false,
          island_noise_override: false,
          amplified: false,
          size_horizontal: 1,
          size_vertical: 2,
          height: 128,
          sampling: {
            xz_scale: 1,
            y_scale: 3,
            xz_factor: 80,
            y_factor: 60
          },
          top_slide: {
            target: 120,
            size: 3,
            offset: 0
          },
          bottom_slide: {
            target: 320,
            size: 4,
            offset: -1
          }
        },
        default_block: {
          Name: "minecraft:netherrack"
        },
        default_fluid: {
          Name: "minecraft:lava",
          Properties: {
            level: "0"
          }
        }
      },
      'minecraft:end': {
        name: 'minecraft:end',
        bedrock_roof_position: -10,
        bedrock_floor_position: -10,
        sea_level: 0,
        disable_mob_generation: true,
        noise: {
          density_factor: 0,
          density_offset: 0,
          simplex_surface_noise: true,
          random_density_offset: false,
          island_noise_override: true,
          amplified: false,
          size_horizontal: 2,
          size_vertical: 1,
          height: 128,
          sampling: {
            xz_scale: 2,
            y_scale: 1,
            xz_factor: 80,
            y_factor: 160
          },
          top_slide: {
            target: -3000,
            size: 64,
            offset: -46
          },
          bottom_slide: {
            target: -30,
            size: 7,
            offset: 1
          }
        },
        default_block: {
          Name: "minecraft:end_stone"
        },
        default_fluid: {
          Name: "minecraft:air"
        }
      },
      'minecraft:amplified': {
        name: 'minecraft:amplified',
        bedrock_roof_position: -10,
        bedrock_floor_position: 0,
        sea_level: 63,
        disable_mob_generation: false,
        noise: {
          density_factor: 1,
          density_offset: -0.46875,
          simplex_surface_noise: true,
          random_density_offset: true,
          island_noise_override: false,
          amplified: true,
          size_horizontal: 1,
          size_vertical: 2,
          height: 256,
          sampling: {
            xz_scale: 1,
            y_scale: 1,
            xz_factor: 80,
            y_factor: 160
          },
          top_slide: {
            target: -10,
            size: 3,
            offset: 0
          },
          bottom_slide: {
            target: -30,
            size: 0,
            offset: 0
          }
        },
        default_block: {
          Name: "minecraft:stone"
        },
        default_fluid: {
          Name: "minecraft:water",
          Properties: {
            level: "0"
          }
        }
      },
      'minecraft:caves': {
        name: 'minecraft:caves',
        bedrock_roof_position: 0,
        bedrock_floor_position: 0,
        sea_level: 32,
        disable_mob_generation: true,
        noise: {
          density_factor: 0,
          density_offset: 0.019921875,
          simplex_surface_noise: false,
          random_density_offset: false,
          island_noise_override: false,
          amplified: false,
          size_horizontal: 1,
          size_vertical: 2,
          height: 128,
          sampling: {
            xz_scale: 1,
            y_scale: 3,
            xz_factor: 80,
            y_factor: 60
          },
          top_slide: {
            target: 120,
            size: 3,
            offset: 0
          },
          bottom_slide: {
            target: 320,
            size: 4,
            offset: -1
          }
        },
        default_block: {
          Name: "minecraft:stone"
        },
        default_fluid: {
          Name: "minecraft:water",
          Properties: {
            level: "0"
          }
        }
      },
      'minecraft:floating_islands': {
        name: 'minecraft:floating_islands',
        bedrock_roof_position: -10,
        bedrock_floor_position: -10,
        sea_level: 0,
        disable_mob_generation: true,
        noise: {
          density_factor: 0,
          density_offset: 0,
          simplex_surface_noise: true,
          random_density_offset: false,
          island_noise_override: true,
          amplified: false,
          size_horizontal: 2,
          size_vertical: 1,
          height: 128,
          sampling: {
            xz_scale: 2,
            y_scale: 1,
            xz_factor: 80,
            y_factor: 160
          },
          top_slide: {
            target: -3000,
            size: 64,
            offset: -46
          },
          bottom_slide: {
            target: -30,
            size: 7,
            offset: 1
          }
        },
        default_block: {
          Name: "minecraft:stone"
        },
        default_fluid: {
          Name: "minecraft:water",
          Properties: {
            level: "0"
          }
        }
      }
    }
  )
}