-- ## OSRM profile file

-- The profile file is used to define speeds and routability for OSRM. It is
-- possible to define speeds conditionally based on way tags and other attributes.

-- The profile used for this project is pretty simple and straightforward.
-- The road network only contains roads that we need to account for, not having
-- one ways, traffic lights, private roads, etc. All roads are considered routable
-- depending on the condition and surface.


-- Additional information about `.lua` profiles:
-- - https://www.winwaed.com/blog/2015/11/18/osrms-lua-scripts/
-- - https://github.com/Project-OSRM/osrm-backend/wiki/Profiles
-- - https://github.com/Project-OSRM/osrm-backend/blob/master/docs/profiles.md

api_version = 4

-- Define the properties and configuration.
function setup ()
  return {
    properties = {
      -- Increase accuracy of routing.
      max_speed_for_map_matching      = 180/3.6, -- kmph -> m/s - Make it unlimited
      weight_name                     = 'distance',
      weight_precision               = 5
    }
  }
end

function process_node (profile, node, result)
  -- The road network is very simple. Nothing to do on nodes.
end

function process_way (profile, way, result)
  -- Use the way id tag as its name
  local name = way:get_value_by_key('id')
  -- Set the name that will be used for instructions
  if name then
    result.name = name
  end

  result.forward_mode = mode.driving
  result.backward_mode = mode.driving

  -- In this case we just care about shortest path, so the values are the same.
  result.forward_speed = 100
  result.backward_speed = 100

  -- By setting rate = speed on all ways, the result will be shortest
  -- path routing.
  result.forward_rate = 100
  result.backward_rate = 100

end

function process_turn (profile, turn)
  -- There are no turn restrictions to process.
end

return {
  setup = setup,
  process_way = process_way,
  process_node = process_node,
  process_turn = process_turn
}
