Your requirement needs to go beyond simply telling OpenCode to add more ramps, reduce obstacles, or enlarge the maps. You need a complete mathematical map-generation and validation system for Yaply.

The biggest change I would make is this: OpenCode must stop treating maps as collections of decorative 3D objects. It must treat every map as a mathematically engineered, physically drivable kart-combat environment.

I have expanded your requirements into a much stricter implementation specification. It covers:

- Smash Karts-inspired arena families and all the map names in your reference.
- Full 3D geometry, depth, elevation, terrain and curved surfaces.
- Kart physics, collision detection, friction, steering and suspension.
- Proper ramps, bridges, tunnels, slopes and climbable obstacles.
- Automated obstacle removal and map rejection.
- Cyberpunk-themed original arenas.
- Mathematical validation before a map can enter production.
- Free-tier development, assets, libraries and hosting.

# Yaply – Complete 3D Arena Engineering & Reconstruction Specification



Free-tier requirement

Mathematics-driven

3D physics and geometry



The following is the master instruction I would give OpenCode.

# YAPLY — COMPLETE 3D KART ARENA ENGINEERING, PHYSICS, GEOMETRY & MAP RECONSTRUCTION

## 1. PRIMARY OBJECTIVE

Completely audit, redesign and upgrade the existing Yaply 3D kart-combat maps.

The current maps have significant design and engineering problems:

- Too many obstacles occupy the playable area.
- Excessive flat, rectangular and box-shaped obstacles.
- Objects that visually appear climbable but physically stop the kart.
- Objects that have incorrect collision geometry.
- Insufficient open driving space.
- Inadequate elevation changes.
- Poorly designed ramps and slope transitions.
- Insufficient interconnected driving routes.
- Maps that look like collections of objects instead of professionally engineered 3D arenas.
- Inconsistent kart physics across different terrain types.
- Poor utilization of the actual 3D depth of the environment.

These problems must be addressed at the underlying mathematical, geometric, collision and physics levels.

**Do not simply apply new textures, increase lighting, add more decorative models or change colours.**

The actual map geometry, terrain, collision structures, driving routes, elevation profiles and physics must be redesigned.

The objective is to achieve the overall level of environmental quality, spatial complexity, driving freedom and gameplay readability associated with professional kart-combat games such as Smash Karts.

Use Smash Karts as a gameplay and design reference, not as permission to copy proprietary source code, exact layouts, models, textures or other copyrighted assets. Build original implementations of the recognizable arena design archetypes.

---

# 2. FIRST: AUDIT THE ENTIRE EXISTING IMPLEMENTATION

Before changing anything:

1. Inspect the entire repository.
2. Identify the existing 3D rendering engine.
3. Identify the map-generation system.
4. Identify all existing map configurations.
5. Identify all terrain and obstacle models.
6. Identify the kart movement controller.
7. Identify collision detection and physics implementation.
8. Identify all ramp, bridge, slope and jump mechanics.
9. Identify weapon-box spawning positions.
10. Identify multiplayer synchronization dependencies.
11. Identify map boundaries, spawn points and respawn logic.
12. Identify existing optimization and rendering systems.

Produce an internal technical inventory.

Do not introduce a second physics engine or rendering engine unnecessarily. Preserve the existing technology stack wherever possible.

The multiplayer architecture, Cloudflare Durable Objects, existing room protocol, player synchronization and weapon systems must continue working.

Do not break existing game modes.

Create a backup or a recoverable Git checkpoint before making destructive changes.

---

# 3. ESTABLISH A MATHEMATICAL WORLD COORDINATE SYSTEM

All maps must use consistent world-space measurements.

Use:

- X: horizontal width.
- Y: vertical elevation.
- Z: horizontal depth.
- Origin: arena center.
- Unit system: consistent game-world units, preferably 1 unit = 1 metre as a design convention.

Every map must have a documented mathematical representation.

For an initial standard arena:

| Property             | Starting specification |
| -------------------- | ---------------------- |
| Arena width          | 100 units              |
| Arena depth          | 100 units              |
| Main terrain         | Variable elevation     |
| Kart length          | 3.0–3.5 units          |
| Kart width           | 1.8–2.2 units          |
| Main road width      | 8–12 units             |
| Secondary road width | 5–7 units              |
| Combat areas         | 25–35% target          |
| Open driving area    | 40–50% target          |
| Obstacle footprint   | 15–22% target          |
| Hazard footprint     | 5–10% target           |

These are initial design targets, not official Smash Karts measurements.

The map dimensions must be configurable.

Not every map should be square.

Use different proportions:

- Standard combat arena: 1:1.
- Rectangular combat arena: 1:1.25.
- Racing arena: 1:1.5.
- Extended obstacle arena: 1:1.7.

Build arenas with actual three-dimensional depth, not merely a flat plane with objects placed on it.

---

# 4. COMPLETE 3D TERRAIN MATHEMATICS

This is a mandatory requirement.

Every terrain surface must be represented by a continuous height function:

h(x,z) = terrain elevation.

The terrain surface is:

P(x,z) = (x, h(x,z), z)

Implement a combination of:

- Parametric terrain surfaces.
- Bezier curves.
- Cubic splines.
- Catmull-Rom splines.
- Heightfield interpolation.
- Procedural mesh generation.
- Explicit ramp and bridge geometry.

Use smooth terrain transitions.

For a terrain region, implement a Gaussian elevation feature:

h(x,z) = H exp(-((x-x₀)²/a² + (z-z₀)²/b²))

Where:

- H = elevation amplitude.
- x₀,z₀ = feature center.
- a,b = horizontal and depth spread.

Use this for hills, mounds and terrain depressions.

Use smooth blending between surfaces.

For example:

s(t) = 3t² - 2t³

For smoother transitions:

s(t) = 6t⁵ - 15t⁴ + 10t³

Do not create sudden vertical changes between terrain sections unless they are intentional walls or cliffs.

Every terrain transition must be tested for kart accessibility.

## Terrain curvature

Calculate the first derivatives:

hₓ = ∂h/∂x

hᵤ = ∂h/∂z

Calculate terrain slope:

θ = arctan(√(hₓ² + hᵤ²))

Calculate the surface normal:

N = normalize((-hₓ, 1, -hᵤ))

The normal must be used by the physics system for:

- Ground alignment.
- Traction calculations.
- Suspension.
- Surface detection.
- Ramp transitions.
- Kart orientation.

Do not use decorative mesh normals as a replacement for actual collision-surface normals.

---

# 5. COMPLETE CURVE AND ROAD GEOMETRY

Every road must be designed around an actual driving centerline.

Use a parametric curve:

C(t) = (x(t), y(t), z(t))

Where t ranges from 0 to 1.

Generate the road surface around this centerline.

Calculate the tangent:

T(t) = C'(t) / |C'(t)|

Calculate curvature:

κ(t) = |C'(t) × C''(t)| / |C'(t)|³

Calculate the radius of curvature:

R(t) = 1 / κ(t)

For zero curvature, treat the radius as infinite.

Implement four primary curve types:

### A. Wide sweeping curves

- Centerline radius: 10–16 units.
- Smooth steering.
- High-speed combat.
- Wide road boundaries.

### B. Medium curves

- Radius: 6–10 units.
- Moderate steering.
- Multiple approach directions.

### C. Hairpin turns

- Radius: 4–6 units.
- Controlled speed reduction.
- Wider entry and exit areas.

### D. Chicanes

- Two alternating curves.
- Smooth directional transition.
- Enough width for kart avoidance and weapon dodging.

These are initial geometry targets. Validate them against the actual kart controller.

Use cubic Bezier curves:

B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃

Generate road edges from the centerline and its lateral direction.

For a road with width w:

LeftEdge(t) = C(t) + w/2 × L(t)

RightEdge(t) = C(t) - w/2 × L(t)

Use a stable 3D frame for lateral directions on curved and elevated roads.

Do not allow roads to twist unexpectedly.

Road surfaces must have:

- Correct width.
- Smooth curvature.
- Correct elevation.
- Correct collision geometry.
- Properly connected intersections.
- Smooth transitions between sections.

No abrupt disconnected road meshes.

---

# 6. KART PHYSICS — MATHEMATICAL IMPLEMENTATION

The map geometry and kart controller must be designed together.

A map is not considered complete merely because its geometry looks good.

It must be physically drivable.

Implement or audit the following physical systems.

## A. Steering and turning radius

Use a bicycle-model approximation:

R = L / tan(δ)

Where:

- R = turning radius.
- L = wheelbase.
- δ = steering angle.

Calculate the minimum practical turning radius from the actual kart configuration.

Road widths and obstacle clearances must account for the kart's full swept path, not just its center point.

## B. Linear motion

Use:

F = ma

a = F/m

Integrate velocity and position using a fixed physics timestep.

v(t+Δt) = v(t) + aΔt

p(t+Δt) = p(t) + v(t)Δt

Use semi-implicit Euler integration or the existing physics engine's equivalent stable method.

Do not make movement dependent on the variable rendering frame rate.

## C. Friction and traction

Maximum available tire force:

Fₜ ≤ μN

Where:

- μ = surface friction coefficient.
- N = normal force.

Use separate friction parameters for:

- Asphalt.
- Concrete.
- Dirt.
- Sand.
- Snow.
- Ice.
- Metal.
- Wet surfaces.
- Special futuristic surfaces.

Calculate slope effects and traction limits.

Prevent karts from unrealistically climbing steep slopes without sufficient traction.

## D. Lateral acceleration

aₗ = v²/R

Required lateral force:

Fₗ = mv²/R

If the required lateral force exceeds available tire friction, implement controlled sliding or loss of grip.

Do not let karts turn instantly at high speed without any physical consequence.

## E. Gravity and slopes

Use:

Fgravity = mg

Along an inclined surface:

Fparallel = mg sin(θ)

Normal component:

Fnormal = mg cos(θ)

The kart must respond to elevation and slope changes.

## F. Jumping and falling

Use:

y(t) = y₀ + v₀t - ½gt²

Vertical velocity:

vᵧ(t) = v₀ - gt

Implement:

- Ramp-based launch.
- Airborne state.
- Gravity.
- Landing detection.
- Ground reattachment.
- Landing impact handling.
- Fall detection.
- Respawning.

The kart must not become stuck in mid-air or teleport onto terrain.

## G. Suspension

Implement suspension or an equivalent stable ground-following system.

Account for:

- Front and rear wheel contact.
- Terrain height differences.
- Ramp entry.
- Ramp exit.
- Landing compression.
- Uneven ground.

The chassis must not continuously clip into the ground.

---

# 7. RAMP ENGINEERING — NO FAKE RAMPS

This is one of the highest-priority requirements.

There are currently too many objects that look like ramps or climbable structures but are actually flat collision-blocking objects.

Fix the underlying collision geometry.

A ramp must be an actual continuous driving surface.

For a straight ramp:

L = H / tan(θ)

Where:

- L = horizontal run.
- H = vertical height.
- θ = ramp inclination.

Example:

For a ramp reaching 3 units at 20 degrees:

L = 3 / tan(20°)

L ≈ 8.24 units.

Every ramp must include:

1. Ground entry transition.
2. Ascending surface.
3. Optional curved transition.
4. Elevated platform.
5. Descending surface.
6. Ground exit transition.

Use smooth transitions rather than connecting independent flat planes with sharp edges.

Use a cubic or quintic transition profile.

For example:

y(t) = y₀ + H(6t⁵ - 15t⁴ + 10t³)

Apply this only to appropriate ramp transition segments and ensure endpoint derivatives match adjacent surfaces.

## Ramp classification

| Surface       | Initial angle | Behaviour         |
| ------------- | ------------- | ----------------- |
| Flat          | 0–5°          | Normal driving    |
| Gentle        | 5–15°         | Easy climbing     |
| Moderate      | 15–25°        | Climbable         |
| Steep         | 25–35°        | Requires momentum |
| Extreme       | 35–45°        | Special physics   |
| Near vertical | 70–90°        | Non-climbable     |

These are design categories, not universal traction guarantees.

Each ramp must pass an actual kart traversal test.

A mesh being visually inclined is not sufficient.

---

# 8. OBSTACLE SYSTEM — REMOVE EXCESSIVE AND INCORRECT OBSTACLES

The existing obstacle density must be substantially reduced.

Do not generate obstacles simply to fill empty space.

Empty driving space is an intentional and essential part of a kart-combat arena.

Every obstacle must belong to a defined collision category.

### Category 1: Solid barriers

Examples:

- Large buildings.
- Walls.
- Tree trunks.
- Large rocks.
- Fortifications.

Properties:

- Block kart movement.
- Block or appropriately interact with projectiles.
- Cannot be climbed.
- Have simplified, predictable collision geometry.

### Category 2: Climbable objects

Examples:

- Low mounds.
- Intentionally designed sloped rocks.
- Small hills.
- Special terrain structures.

Properties:

- Must have a continuous traversable surface.
- Must pass the kart clearance test.
- Must have proper collision normals.
- Must not trap the kart.

### Category 3: Decorative objects

Examples:

- Grass.
- Small vegetation.
- Background buildings.
- Decorative signs.
- Non-interactive environmental details.

Properties:

- No unnecessary kart collision.
- No unnecessary projectile collision.
- Must not occupy usable driving space.

### Category 4: Special surfaces

Examples:

- Ramps.
- Bridges.
- Elevated platforms.
- Tunnels.
- Curved tracks.

Properties:

- Valid driving surfaces.
- Correct surface collision.
- Connected to accessible routes.

### Category 5: Hazardous surfaces

Examples:

- Water.
- Lava.
- Bottomless drops.
- Electrical hazards.
- Special cyberpunk energy fields.

Properties:

- Defined hazard boundaries.
- Predictable elimination or damage behaviour.
- Visually clear boundaries.

## Obstacle density restrictions

For a standard 100 × 100 arena:

- Target open driving space: 40–50%.
- Target obstacle footprint: 15–22%.
- Target hazardous areas: 5–10%.

Measure actual geometry coverage and navigable surface area separately.

Do not count decorative non-colliding objects as solid obstacles.

No unnecessary obstacle clusters.

No repetitive box-shaped obstacle arrangements.

No randomly distributed rectangular blocks covering the arena.

Every obstacle must have a documented gameplay purpose.

## Automated obstacle rejection

Build an obstacle-validation pipeline.

For every obstacle, calculate:

- Bounding volume.
- Collision footprint.
- Height.
- Surface slope.
- Clearance.
- Distance to adjacent obstacles.
- Distance to road centerlines.
- Effect on navigable space.
- Effect on kart turning radius.
- Whether it blocks all possible routes.

If an obstacle:

- Blocks an essential driving route.
- Creates an impossible collision.
- Has an incorrect collider.
- Occupies excessive driving space.
- Creates an inaccessible pickup.
- Violates the minimum clearance.
- Creates a dead end without gameplay justification.

Then automatically reject it.

Replace it with an appropriate alternative where possible.

Examples:

- Large rectangular block → smaller stylized cover.
- Flat blocking rock → decorative non-colliding rock or properly sloped terrain.
- Unnecessary wall → open terrain.
- Incorrectly placed building → relocate outside the playable driving area.
- Unclimbable fake ramp → regenerate with proper ramp geometry.

Do not preserve an object merely because it already exists in the current map.

**The existing map geometry is not sacred. The mathematical and gameplay requirements take priority.**

Back up the original map assets, then remove or replace non-compliant map elements. Do not delete unrelated application code, player systems, game modes, weapons or multiplayer functionality.

---

# 9. COMPLETE ARENA FAMILY IMPLEMENTATION

Create distinct original arenas inspired by the following Smash Karts map families.

These must not be simple recolours of the same underlying map.

Each arena must have its own geometry, terrain, route structure, elevation, obstacle distribution and gameplay identity.

## A. Gravel Pit

Identity: Open combat arena.

Requirements:

- Large open driving zones.
- Scattered rock formations.
- Multiple approach directions.
- Wide curved driving routes.
- Moderate elevation changes.
- Limited cover.
- No excessive rock placement.

## B. Graveyard

Identity: Obstacle-rich environmental arena.

Requirements:

- Graveyard architecture.
- Headstones and trees.
- Open combat areas.
- Curved pathways.
- Optional water boundaries.
- Carefully controlled obstacle collision.
- Multiple routes around structures.

## C. Lava Pit

Identity: Hazard and risk-reward arena.

Requirements:

- Lava zones.
- Elevated safe platforms.
- Bridges.
- Connected ramps.
- Multiple crossing opportunities.
- Clearly defined hazardous boundaries.
- Risk-reward alternative routes.

## D. Skate Park

Identity: Vertical movement arena.

Requirements:

- Half-pipes.
- Quarter-pipes.
- Curved ramps.
- Elevated platforms.
- Smooth transition geometry.
- Jump opportunities.
- Wide landing areas.
- Multiple elevation levels.

## E. Snowpark

Identity: Snow terrain arena.

Requirements:

- Snow-covered terrain.
- Natural slopes.
- Smooth hills.
- Ice sections.
- Snow-covered obstacles.
- Different friction values.
- Wide open driving paths.

## F. Snow Shrine

Identity: Structured winter architectural arena.

Requirements:

- Central shrine.
- Elevated structures.
- Bridges and connecting paths.
- Snow terrain.
- Architectural cover.
- Multiple entry and exit points.
- Open combat areas.

## G. Space Station

Identity: Futuristic sci-fi arena.

Requirements:

- Large central structures.
- Metallic surfaces.
- Elevated platforms.
- Connecting bridges.
- Tunnels.
- Wide corridors.
- Sci-fi environmental lighting.
- Multiple interconnected routes.

## H. Steky's Speedway

Identity: Racing and combat combination.

Requirements:

- Continuous racing track.
- Long sweeping curves.
- Overtaking sections.
- Chicanes.
- Wide turning areas.
- Combat zones integrated into the circuit.
- Alternative shortcuts.

## I. Smash Fort

Identity: Compact multi-level castle arena.

Requirements:

- Castle structure.
- Surrounding walls.
- Central courtyard.
- Elevated areas.
- Ramps.
- Bridge sections.
- Multiple entry points.
- Optional secret passages.

## J. Smash Island

Identity: Island combat arena.

Requirements:

- Island terrain.
- Water boundaries.
- Coastal routes.
- Elevated sections.
- Multiple pathways.
- Safe driving areas.
- Clearly defined falling hazards.

## K. Slick 'n Slide

Identity: Momentum and slippery-surface arena.

Requirements:

- Slippery roads.
- Wide curved paths.
- Drifting areas.
- Momentum-based driving.
- Controlled sharp turns.
- Surface friction variation.
- Multiple driving approaches.

## L. Sky Arena Variants

Create distinct original variants inspired by:

- Dropzone.
- Pinball.
- Showdown.
- Temples.
- Tunnels.

Requirements:

- Elevated platforms.
- Vertical hazards.
- Jumping and falling mechanics.
- Different platform arrangements.
- Bouncing or special obstacle mechanics where appropriate.
- Base-to-base team routes.
- Narrow passages with alternative approaches.

Do not make all these arenas share the same geometry.

Each one must have its own independently defined map configuration.

---

# 10. CYBERPUNK ARENA COLLECTION

In addition to the Smash Karts-inspired arena families, create an original cyberpunk arena collection.

These must be fully playable 3D environments, not flat neon environments with random buildings.

### A. Neon District

- Large interconnected city streets.
- Neon signs.
- Elevated roadways.
- Buildings with different heights.
- Underground passages.
- Wide intersections.
- Rooftop-accessible routes where physically supported.

### B. Cyberpunk Industrial Zone

- Industrial platforms.
- Pipes.
- Mechanical structures.
- Elevated bridges.
- Factory interiors.
- Wide driving corridors.
- Hazardous energy zones.

### C. Night City Circuit

- Long racing circuit.
- Curved elevated roads.
- High-speed sections.
- Tunnels.
- Overpasses.
- Multiple shortcuts.
- Neon environmental lighting.

### D. Neon Rooftops

- Connected rooftops.
- Wide ramps.
- Bridges between buildings.
- Multiple height levels.
- Jump sections.
- Fall hazards.
- Proper landing surfaces.

### E. Underground Cyber Arena

- Underground tunnels.
- Curved passages.
- Large combat chambers.
- Multi-level sections.
- Industrial machinery.
- Neon lighting.
- Multiple routes.

### F. Cyberpunk Combat District

- Open combat plaza.
- Building cover.
- Elevated walkways.
- Large central combat zone.
- Multiple flank routes.
- Carefully distributed weapon pickups.

Every cyberpunk arena must preserve driving readability.

Neon effects must never hide road edges, ramps, hazards, obstacles or collision boundaries.

---

# 11. COMPLETE 3D DEPTH AND VERTICALITY

Do not create a map that is effectively a 2D plane.

Every arena should have meaningful depth.

Use multiple elevation levels where appropriate:

- Ground level.
- Lower passages.
- Intermediate platforms.
- Elevated routes.
- Bridges.
- Rooftops.
- Ramps.
- Underground tunnels.

Implement actual geometry for these structures.

Do not fake an elevated bridge using a decorative flat object.

For every elevated structure:

1. Generate its surface mesh.
2. Generate appropriate collision geometry.
3. Connect it to the ground using valid ramps.
4. Verify the kart can enter and exit.
5. Validate overhead clearance.
6. Check intersections with other geometry.
7. Verify that it is visible and navigable.

Tunnels must have sufficient width and height for the kart's full bounding volume.

Bridges must have proper supporting geometry and valid boundaries.

---

# 12. DRIVING ROUTE GRAPH AND NAVIGATION VALIDATION

Every arena must contain a mathematically defined driving network.

Represent driving routes as a graph:

G = (V,E)

Where:

- V = intersections, junctions and route endpoints.
- E = traversable road segments.

Every route segment must contain:

- Centerline spline.
- Width.
- Elevation profile.
- Curvature profile.
- Surface type.
- Collision information.
- Entry and exit positions.

Target 3–4 distinct interconnected driving routes in standard arenas.

Build graph connectivity checks.

Reject maps where:

- Important areas are unreachable.
- Routes terminate unexpectedly.
- A ramp leads to an inaccessible platform.
- A bridge does not connect to another valid surface.
- A tunnel ends inside solid geometry.
- A major area becomes isolated.

Create automated pathfinding checks using a suitable navigation grid or waypoint graph.

Test routes using the actual kart clearance radius, not just a point-based pathfinder.

---

# 13. WEAPON PICKUP AND SPAWN DISTRIBUTION

Weapon boxes must be positioned intelligently.

For a 100 × 100 arena, start with 7–10 simultaneous pickup boxes.

Suggested distribution:

| Zone            | Allocation |
| --------------- | ---------- |
| Central combat  | 25%        |
| Outer routes    | 25%        |
| Near ramps      | 20%        |
| Around cover    | 20%        |
| Less-used areas | 10%        |

Use predefined valid spawn positions.

Validate each position against:

- Terrain height.
- Collision geometry.
- Kart accessibility.
- Distance from walls.
- Distance from hazards.
- Minimum separation from other pickups.

Do not randomly spawn weapon boxes inside obstacles or inaccessible locations.

All pickup locations must be reachable through the driving network.

---

# 14. AUTOMATED MATHEMATICAL MAP VALIDATION

This is a mandatory production requirement.

Build an automated arena-validation tool.

It must evaluate each map before publication.

Calculate:

1. Arena dimensions.
2. Playable terrain area.
3. Navigable surface percentage.
4. Solid obstacle percentage.
5. Decorative object percentage.
6. Average road width.
7. Minimum road width.
8. Maximum slope.
9. Ramp length and angle.
10. Curvature distribution.
11. Turning-radius compatibility.
12. Collision overlaps.
13. Kart clearance.
14. Vertical clearance.
15. Route graph connectivity.
16. Pickup accessibility.
17. Spawn accessibility.
18. Hazard boundary correctness.
19. Surface friction configuration.
20. Dead-end and trap detection.

Create a report for every map.

Example:

MAP VALIDATION: NEON DISTRICT

Arena dimensions: 100 × 125\
Navigable surface: 47%\
Solid obstacle footprint: 18%\
Open combat area: 31%\
Average main road width: 9.5 units\
Minimum road width: 5.5 units\
Maximum ordinary road slope: 24°\
Connected driving routes: 4\
Inaccessible platforms: 0\
Invalid collision meshes: 0\
Unreachable pickups: 0\
Spawn collision failures: 0

RESULT: PASS

Use actual calculated values, never hardcoded or fabricated reports.

## Validation rules

A map must fail validation if:

- It contains an unreachable mandatory route.
- A pickup is inaccessible.
- A spawn point is invalid.
- A ramp cannot be traversed.
- A collision mesh causes an impossible blockage.
- A road has insufficient width.
- An obstacle blocks every valid route.
- A bridge or elevated platform is disconnected.
- Critical terrain geometry overlaps incorrectly.
- Kart physics produce unstable ground transitions.

Create configurable thresholds per arena type.

Do not force every arena into identical numerical requirements.

---

# 15. AUTOMATED MAP CLEANUP AND REGENERATION

Implement a map cleanup pipeline.

The process must be:

1. Load existing map.
2. Extract all geometry.
3. Identify all collision objects.
4. Calculate geometry and navigation metrics.
5. Identify non-compliant elements.
6. Generate a validation report.
7. Remove or replace non-compliant map elements.
8. Regenerate affected geometry.
9. Recalculate all metrics.
10. Run driving simulations.
11. Repeat until the map passes or reaches a documented generation failure.

Do not leave invalid obstacles in the final production maps merely because they were part of the previous implementation.

Do not silently retain old geometry that violates the new specification.

Preserve the original map in version control so changes are reversible.

If a map cannot pass validation, do not publish it as a completed arena.

---

# 16. VISUAL QUALITY AND ENVIRONMENTAL DETAIL

Visual quality must be built on top of proper geometry.

Implement:

- Terrain material variation.
- Proper road materials.
- Realistic depth and elevation.
- Environmental lighting.
- Shadows where affordable.
- Atmospheric effects.
- Skyboxes.
- Environmental structures.
- Distinct map identities.
- Appropriate surface markings.
- Collision-aware decoration.

Avoid excessive flat rectangular structures.

Use rounded, curved, irregular or custom-shaped geometry where appropriate.

However, do not use unnecessarily complicated collision meshes.

Keep visual geometry and collision geometry separate.

A detailed rock can have a low-complexity collision representation.

A decorative neon sign should not block a kart.

A visually solid wall must have a solid collision representation.

Players must immediately understand what can be driven over, what can be climbed, what blocks movement and what causes elimination.

---

# 17. FREE-TIER-ONLY DEVELOPMENT REQUIREMENTS

This project must remain implementable without paid services.

Do not introduce:

- Paid asset subscriptions.
- Paid map-generation APIs.
- Paid AI 3D-model generation services.
- Paid physics engines.
- Paid hosting requirements.
- Paid cloud rendering.
- Paid multiplayer infrastructure.
- Mandatory credit-card services.

Prefer:

- Existing project dependencies.
- Three.js or the existing renderer.
- Existing physics dependencies where appropriate.
- Procedural geometry.
- Custom mathematical mesh generation.
- Blender for optional local asset creation.
- Free and open-source CC0 or appropriately licensed assets.
- Local development tools.
- GitHub free-tier workflows.
- Existing Vercel Hobby and Cloudflare Workers free-tier infrastructure.

Do not add a dependency merely because it is popular.

Evaluate bundle size, performance and licensing before adding any package.

All asset licenses must be documented.

Never use ripped Smash Karts assets.

The implementation must work without any paid external API or subscription.

Respect actual free-tier usage limits. Do not promise unlimited hosting, rendering or multiplayer capacity.

---

# 18. PERFORMANCE REQUIREMENTS

The new maps must remain efficient.

Optimize for lower-end hardware.

Implement:

- Geometry instancing.
- Shared materials.
- Collision simplification.
- Level of detail where useful.
- Frustum culling.
- Efficient terrain meshes.
- Texture reuse.
- Spatial partitioning.
- Efficient collision queries.
- Fixed-timestep physics.
- Controlled shadow quality.
- Reduced unnecessary draw calls.

Do not create thousands of independent physics objects.

Do not give decorative objects expensive collision bodies.

Do not sacrifice map scale and driving quality merely to increase decorative object count.

Measure performance using actual profiling.

---

# 19. MULTIPLAYER COMPATIBILITY

All maps must remain fully compatible with Yaply multiplayer.

Preserve:

- Existing player movement synchronization.
- Existing room communication.
- Existing game-state protocol.
- Weapon synchronization.
- Player spawning.
- Respawning.
- Match lifecycle.
- Existing game modes.

All clients must use the same deterministic map configuration and geometry parameters.

Map generation must not produce different collision layouts on different clients.

Use a map seed and deterministic generation where procedural variation is required.

Do not synchronize every terrain vertex over the network.

Synchronize the selected map identifier, configuration version and deterministic seed where appropriate.

Keep physics simulation authoritative according to the existing multiplayer architecture.

---

# 20. IMPLEMENTATION ORDER

Do not attempt to add every map at once without fixing the underlying system.

Implement in the following order.

### Phase 1 — Existing system audit

- Inspect the complete repository.
- Identify existing maps.
- Identify the renderer and physics engine.
- Identify collision problems.
- Document current technical limitations.

### Phase 2 — Mathematical terrain engine

- Implement terrain functions.
- Implement smooth elevation transitions.
- Implement spline-based roads.
- Implement ramp geometry.
- Implement collision surfaces.

### Phase 3 — Kart physics integration

- Validate steering.
- Validate traction.
- Validate slope climbing.
- Validate ramp traversal.
- Validate jumping.
- Validate landing.
- Validate suspension and ground detection.

### Phase 4 — Obstacle reconstruction

- Classify existing obstacles.
- Remove excessive obstacles.
- Correct collision geometry.
- Replace fake ramps.
- Increase playable driving space.
- Recalculate obstacle density.

### Phase 5 — Navigation and validation engine

- Implement route graphs.
- Implement clearance checks.
- Implement collision checks.
- Implement pickup accessibility.
- Implement spawn validation.
- Implement automated map reports.

### Phase 6 — First reference arena

Complete one professionally engineered open combat arena.

It must demonstrate the new system before proceeding.

### Phase 7 — Complete arena collection

Implement all the distinct Smash Karts-inspired arena families described above.

### Phase 8 — Cyberpunk collection

Implement the six original cyberpunk arenas.

### Phase 9 — Multiplayer and performance testing

- Test multiple clients.
- Test identical geometry across clients.
- Test collision synchronization.
- Profile rendering.
- Test lower-end hardware.
- Check free-tier infrastructure usage.

---

# 21. FINAL ACCEPTANCE CRITERIA

The task is not complete merely because the maps render.

The final implementation must satisfy all of the following:

- Every arena has meaningful three-dimensional geometry.
- Every arena has its own identifiable layout.
- No excessive flat obstacle placement.
- No fake climbable structures.
- No accidental collision-blocking decorations.
- Proper curved driving routes.
- Correct terrain normals.
- Valid elevation transitions.
- Properly calculated ramp geometry.
- Correct kart-to-road proportions.
- Multiple interconnected routes.
- Accessible pickups.
- Valid spawn points.
- Correct hazard boundaries.
- No disconnected bridges or platforms.
- Stable kart physics.
- No unexpected collision traps.
- Deterministic multiplayer maps.
- Automated mathematical validation.
- Automated rejection of non-compliant geometry.
- Performance optimization.
- No mandatory paid services.

## FINAL INSTRUCTION

Prioritize actual engineering over superficial visual improvements.

Do not preserve bad existing geometry for backward compatibility.

Do not generate random obstacle-filled arenas.

Do not consider a map complete because it looks attractive in a screenshot.

A map must be mathematically valid, physically traversable, properly connected, multiplayer-compatible and performance-tested.

If an existing map fails these requirements, redesign it.

If an individual obstacle fails these requirements, remove or replace it.

If an individual ramp fails traversal testing, regenerate it.

If an entire map fails validation, do not publish it.

The objective is to transform Yaply into a collection of professionally engineered, large-scale, three-dimensional kart-combat arenas with the spatial quality and gameplay depth expected from a polished commercial kart-combat game, while maintaining a completely free-tier-compatible development approach.

## A few important engineering decisions

I would enforce these additional rules while OpenCode implements this.

| Requirement                          | Why it matters                                  |
| ------------------------------------ | ----------------------------------------------- |
| Separate visual and collision meshes | Prevents decorative objects from blocking karts |
| Fixed timestep physics               | Keeps driving consistent at different FPS       |
| Deterministic map seeds              | Prevents multiplayer map mismatches             |
| Spline-based road generation         | Produces genuinely smooth curves                |
| Automated navigation validation      | Detects unreachable areas                       |
| Actual ramp traversal tests          | Prevents fake climbable geometry                |
| Geometry coverage calculations       | Prevents obstacle overcrowding                  |

## What I particularly want OpenCode to avoid

[Smash Karts Free - Android and iOS - Kids Age Ratings - Family Gaming Database](https://images.openai.com/static-rsc-4/aaURcYKfO-xq05ecXnexvCH_drg0VGWSsuZxz5m-GE07mw2blZeMfqm1E5wmXXG-8QMs1HlDIK4xjUbpNsHGut3djcuda3X6SsjANqZe_ptujrkON3WvmLx4ohtQwTeC667f8Jg-XeP60cAsRle6rj1Lp0DHGmydjZMyCgShe_4?purpose=inline)

Avoid

Flat ground, random boxes, repetitive obstacles and blocked driving paths.

Target

Open driving areas, interconnected routes, proper elevations, curves and usable ramps.

[Steam Community :: skate.](https://images.openai.com/static-rsc-4/eVrZHCJGPxo9L9UBcI81TbQDsTtUnokfkwMXUbURB6ZzHG7hhYlTiRnOMV2x3d6nQu-gAKYMj5uQd3QJ8z1lpU0L9a404aPFEQifzM_AGwwUSERXGvtSJf5WLAR31Dh7dnZsZSAjm7rDxvYdlVkt58abBx09Ax6RF5GM-0jQNE4?purpose=inline)

Verticality

Real curved transitions, half-pipes, elevated roads and landing surfaces.

[Neon Cyber-Track City Unreal Engine Environment (393542) 3D model - Download 3D model Neon Cyber-Track City Unreal Engine Environment (393542) | 393542 | 3d-baza.com](https://images.openai.com/static-rsc-4/qdBc5lI71wFvtVvPm0LnZiZ5p2NQGf4YuWcOhhkbiOe85P6SAavF3XDLgtifahT-fYXyKs5u5QVu7OCQgW4X83sJ8iEHSuhBL826lWps2GcQv8pNGlzEhxuJNwSgiOwQx0-1fBPwQ_NBYmCIYnMRpNEWkRnlnv0-BDCNaJBsAS0?purpose=inline)

Cyberpunk

Multi-level roads, tunnels, city structures and neon combat environments.

## One important distinction about the Smash Karts reference

The specifications above deliberately distinguish between:

- Reference-based design: reproducing the gameplay characteristics and broad arena families.
- Exact reconstruction: copying the original game's precise dimensions, geometry, source code or assets.

The exact official map dimensions and physics parameters aren't publicly established in the reference material. The numerical values in this specification are engineering starting points for Yaply, not claimed official Smash Karts measurements.

## My recommendation for implementation

Do not ask OpenCode to implement all 17+ arenas in one uncontrolled generation.

Make it build the terrain engine, collision system, physics integration and validation engine first. Then make it complete one reference arena, test it, and use that verified foundation for the remaining maps.

This is especially important because you want the project to stay on free infrastructure. Procedural geometry and locally generated assets are much more sustainable than depending on paid asset-generation services.

Next step: Give OpenCode this entire specification from the Yaply repository root, and instruct it to begin with Phase 1. The final deliverable should be actual working map geometry and physics, not just a design document or a collection of screenshots.


----------------------------------------------------------------------------------
----------------------------------------------------------------------------------
----------------------------------------------------------------------------------

below is the architecture

# Yaply – Complete Arena Reconstruction & Physics Engineering Specification

What you need now is not another round of visual improvements. You need a complete level-design and physics overhaul of Yaply's kart game.

I would approach this as a proper game-engineering project: inspect every existing map, measure its actual playable geometry, establish mathematical standards, and rebuild anything that fails those standards.

Your main problems are:

- Too many obstacles occupying the driving area.
- Too many flat, box-shaped obstacles that cannot be climbed.
- Objects that look like ramps but have vertical or incorrect collision meshes.
- Maps that feel cramped instead of having spacious driving routes.
- Insufficient elevation changes and interconnected paths.
- Weapon pickups that don't appear to follow a deliberate distribution strategy.
- Dark environments where obstacles and driving surfaces are difficult to distinguish.

I would not solve this by adding more objects or simply increasing the ground size. I would establish a common mathematical standard for every arena and make the game automatically reject unsuitable map geometry.

There is one important limitation: Smash Karts does not publicly disclose its exact Unity scene coordinates, source collision meshes, physical dimensions, or complete level-generation parameters. We can engineer original arenas that follow its gameplay principles, but claiming to reproduce its exact measurements would be misleading. We should also use original geometry and assets rather than copying proprietary map files.

The goal is to make Yaply feel like a professionally designed kart-combat game, not a collection of decorative 3D environments.

## 1. Complete Smash Karts arena catalogue

I checked the available map catalogues. The documented roster includes substantially more than the original maps we discussed. It also contains special Capture the Flag versions and additional themed arenas.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://smash-karts.fandom.com\&sz=32)

Fandom+2



These are the map identities I would use as design references, not as instructions to copy their exact proprietary geometry.

## Arena reference catalogue

Original Smash Karts map names and variants reported in community catalogues.

Classic and environmental arenas

- The Gravel Pit
- Graveyard
- The Old Graveyard
- Lava Pit
- Smash Island
- Smash Fort
- Steky's Speedway
- Slick 'n Slide

Winter and futuristic arenas

- Snowpark
- Snow Shrine
- Space Station
- Space Stations

Skate and special arenas

- Skate Park
- Kartuga
- Toxic Towers
- The Sand Box
- Boneyard Basin

Sky Arena series

- Sky Arena: Dropzone
- Sky Arena: Pinball
- Sky Arena: Showdown
- Sky Arena: Temples
- Sky Arena: Tunnels

Special variants

- Graveyard CTF
- Lava Pit CTF
- Smash Fort CTF
- Smash Island CTF
- Snowpark CTF
- Space Stations CTF
- Sky Arena CTF variants

Some of these additional and seasonal names come from third-party catalogues and community sources, so their current official availability is not guaranteed.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.drifted.com\&sz=32)

DRIFTED+2



### How I would translate these into Yaply

| Reference        | Yaply implementation objective                 |
| ---------------- | ---------------------------------------------- |
| Gravel Pit       | Open terrain, scattered cover, multiple routes |
| Graveyard        | Sparse tombstones, trees, winding roads        |
| Old Graveyard    | More structured graveyard environment          |
| Lava Pit         | Islands, bridges and lethal lava               |
| Smash Island     | Compact, symmetrical battle arena              |
| Smash Fort       | Castle, walls, ramps and connected levels      |
| Steky's Speedway | Continuous racing circuit with combat          |
| Slick 'n Slide   | Slippery terrain and momentum-based driving    |
| Skate Park       | Quarter-pipes, bowls, ramps and jumps          |
| Snowpark         | Open snowy terrain and smooth slopes           |
| Snow Shrine      | Architectural winter arena                     |
| Space Station    | Futuristic platforms and controlled corridors  |
| Space Stations   | Multi-structure sci-fi combat layout           |
| Sky Dropzone     | Elevated platforms and fall hazards            |
| Sky Pinball      | Bumpers and controlled bouncing                |
| Sky Showdown     | Central combat platform                        |
| Sky Temples      | Symmetrical temple bases                       |
| Sky Tunnels      | Interconnected tunnels and elevated routes     |

Important: Each map should have a different driving identity. Don't just change its textures, skybox and obstacle models.

# 2. Establish one mathematical coordinate system for every map

Before rebuilding anything, standardise the dimensions.

I recommend using the kart as your measurement unit.

Call it `KL` (Kart Length).

Reference kart dimensions

[Kart Chassis Plans at Linwood Morales blog](https://images.openai.com/static-rsc-4/6rbda8bTwGF1QG5wuXqdfVxn6eG2LN1kLDbMUUpyTQWUNdL7Z-rXPp7wD8-1lFgOudsu0cvVGuwAdVnpwMAdhL70CZCMjOA3UwtnzMJ7BviGwLiR80UmEH6SzN07OIjmHn8qNpRshVs76KOWwb2UiHqKRRTpJThUk4bhKfqkKjc?purpose=inline)

[storage.googleapis.com](https://storage.googleapis.com/dxegerlundsehe/kart-chassis-plans.html?utm_source=chatgpt.com)

| Parameter             | Reference value |
| --------------------- | --------------- |
| Kart length           | 3.2 units       |
| Kart width            | 2.0 units       |
| Kart height           | 1.5 units       |
| Wheelbase             | 2.0 units       |
| Wheel radius          | 0.4 units       |
| Ground clearance      | 0.25 units      |
| Mass                  | 180 kg          |
| Centre of mass height | 0.65 units      |

These are engineering reference values for the Yaply prototype, not Smash Karts measurements.

All other measurements derive from these values.

For example:

\\[ 1KL=3.2\text{ units} \\]

A 100-unit arena becomes:

\\[ \frac{100}{3.2}=31.25KL \\]

This makes it easier to scale every arena while preserving kart-to-world proportions.

### Arena dimension standards

| Arena class | Dimensions | Kart lengths      |
| ----------- | ---------- | ----------------- |
| Compact     | 80 × 80    | 25 × 25 KL        |
| Standard    | 100 × 100  | 31 × 31 KL        |
| Large       | 120 × 120  | 37.5 × 37.5 KL    |
| Racing      | 100 × 150  | 31 × 47 KL        |
| Vertical    | 100 × 100  | Multiple Z levels |

Start with the standard arena as your baseline.

These are proposed Yaply dimensions, not measurements from the original game.

### Coordinate conventions

Use:

- X = horizontal world axis.
- Z = horizontal depth axis.
- Y = vertical elevation.
- Ground reference = Y = 0.
- Arena centre = (0, 0, 0).

Every map should have a documented playable bounding box.

For a 100 × 100 map:

\\[ -50\leq X\leq50 \\]

\\[ -50\leq Z\leq50 \\]

The playable elevation could initially be:

\\[ 0\leq Y\leq12 \\]

You can have taller decorative structures, but those shouldn't automatically become driving surfaces.

# 3. The most important change: eliminate obstacle spam

Your maps currently have too many obstacles.

The solution is to measure the amount of actual driving space, rather than simply counting objects.

## A. Arena occupancy calculation

Divide the arena into a grid.

For a 100 × 100 arena, use 1 × 1 cells.

That gives:

\\[ N=100\times100=10,000 \\]

Classify every cell as one of:

- `DRIVABLE`
- `SOLID_OBSTACLE`
- `HAZARD`
- `RAMP`
- `ELEVATED_DRIVABLE`
- `DECORATION_ONLY`
- `OUT_OF_BOUNDS`

Then calculate:

\\[ P\_{drive}=\frac{A\_{drive}}{A\_{total}}\times100 \\]

\\[ P\_{obstacle}=\frac{A\_{obstacle}}{A\_{total}}\times100 \\]

\\[ P\_{hazard}=\frac{A\_{hazard}}{A\_{total}}\times100 \\]

### Yaply target occupancy

Recommended standard arena budget

Connected driveable surface

# 55%

Solid obstacles

# 15%

Hazards

# 8%

Ramps and elevated routes

# 12%

Non-blocking decoration / remaining

# 10%

Planning budget, not a literal requirement that every cell belongs to only one category. Ramp surfaces are also driveable, so the final report should separately track surface coverage and obstacle footprints.

The real requirement is that the drivable area must form several connected routes, not disconnected patches surrounded by obstacles.

## B. Maximum obstacle density

I would introduce a hard rule:

- Don't put obstacles in every open section.
- Avoid rows of identical rectangular blocks.
- Avoid random placement without a collision and route check.
- Never let decorative objects block a driving route.
- Avoid obstacles within kart turning envelopes.
- Avoid making every obstacle a vertical, un-climbable wall.

A useful local density metric is:

\\[ D(x,z)=\frac{A\_{solid}(x,z)}{A\_{window}} \\]

Calculate this in sliding 15 × 15-unit windows.

Initial target:

\\[ D(x,z)\leq0.25 \\]

In ordinary driving regions, no more than 25% of the local area should be occupied by solid obstacle footprints.

A designated fort, maze or objective structure can exceed this, but the surrounding routes must remain usable.

## C. Create a connected driving graph

This is even more important than the occupancy percentage.

Represent each driving region as a graph:

\\[ G=(V,E) \\]

Where:

- \\(V\\) = driveable areas.
- \\(E\\) = connections between those areas.

Every normal arena should have:

- At least three useful routes between major regions.
- More than one approach to important pickups.
- No accidentally isolated driving islands.
- No dead ends that trap a kart.
- At least two escape options from major combat areas.

A route graph is much better than judging the map only by its top-down appearance.

# 4. Full obstacle climbing physics

This is where I would completely change your current collision system.

You need three distinct types of geometry.

[Buckle up, heavy traffic ahead: Update 0.17 released - BeamNG.drive](https://images.openai.com/static-rsc-4/nGm1JwfMOUD8tVEtbE7ZLOO-6bubxcwP1Iap-N690yVWeJEkSNDkT2PNOvZ3k4XnW8xWhLr2TX2E-orV30NSlwSOZcBGQh5wO-SnSntjlMGZoI4ccq2Wzqm0p5Qr92f2CzaJpoyVUlUYpCCxEWZo63aXKgnENBtI47yhpAUwJ0c?purpose=inline)

Driveable

Climb

[EasyRoads3D Tutorial - Race Tracks](https://images.openai.com/static-rsc-4/i8EuWRopO-prDUfhk6RF6vpqJdDcio4LnMQMOgKsImhJx_HQysbUfcOo_oaoMWoFoHSQOX-Td6jq67l16p8NKWiOMk0EkyOEyTsChmNCbBRHjc5QuS4phy75n8zGrMoC1KI0Dyn875AJPC3lcnFMoTwGYy113VNwmT_IMxqzPeE?purpose=inline)

Conditional

Test

[Unity Play | Stunt racer game](https://images.openai.com/static-rsc-4/S8VTtdce_Psy43LAGa2suZmGjgBenZ7hB9vX3vIHwQBWRMjXxJ8lbi8WPXzz0xr0CAs637_gdLT0d9MSVpkY557RI-yRjwZfrexH4BbMpd5T2QfEQRZA6I0TAoywaZLzD1ZX_W0JAKPbwkZUR4_McloT4ESO_VWMu1BfYPvUCvk?purpose=inline)

Blocking

Block

## A. Slope climbing

The gravitational force acting down a slope is:

\\[ F_g=mg\sin(\theta) \\]

The normal force is:

\\[ N=mg\cos(\theta) \\]

The maximum available traction is approximately:

\\[ F_t=\mu mg\cos(\theta) \\]

Where:

- \\(m\\) = kart mass.
- \\(g=9.81m/s^2\\).
- \\(\mu\\) = effective tyre-surface friction.
- \\(\theta\\) = slope angle.

For a kart to climb at constant speed:

\\[ F\_{drive}\geq mg\sin(\theta)+F\_{rolling} \\]

And it must not exceed available traction:

\\[ F\_{drive}\leq\mu mg\cos(\theta) \\]

Therefore, an approximate traction-limited climbing condition is:

\\[ \tan(\theta)\leq\mu \\]

This assumes simplified Coulomb friction and ignores wheel torque, aerodynamic effects and suspension dynamics.

### Example

Suppose:

- Mass = 180 kg.
- Friction coefficient = 0.8.
- Slope = 25°.

Then:

\\[ F_g=180(9.81)\sin(25^\circ) \\]

\\[ F_g\approx746N \\]

Normal force:

\\[ N=180(9.81)\cos(25^\circ) \\]

\\[ N\approx1600N \\]

Available traction:

\\[ F_t=0.8(1600) \\]

\\[ F_t\approx1280N \\]

So the theoretical available traction exceeds the gravitational slope force, leaving room for rolling resistance and acceleration.

### Recommended ramp standards

| Ramp     | Angle | Horizontal run for 2-unit rise |
| -------- | ----- | ------------------------------ |
| Easy     | 10°   | 11.34                          |
| Normal   | 15°   | 7.46                           |
| Medium   | 20°   | 5.49                           |
| Advanced | 25°   | 4.29                           |
| Steep    | 30°   | 3.46                           |
| Extreme  | 35°   | 2.86                           |

These are geometry calculations. Actual driving difficulty depends on the kart's power, grip and speed.

## B. Step and curb climbing

A flat-topped box should not automatically become climbable.

For a wheel of radius \\(r\\) encountering a vertical step of height \\(h\\), the horizontal distance from the step corner to the wheel centre's vertical line is:

\\[ x=\sqrt{2rh-h^2} \\]

For:

\\[ r=0.4,\quad h=0.2 \\]

\\[ x=\sqrt{2(0.4)(0.2)-(0.2)^2} \\]

\\[ x\approx0.346 \\]

The required wheel torque to overcome the step is approximately:

\\[ \tau\geq W\_{wheel}x \\]

where \\(W\_{wheel}\\) is the load on the wheel.

This is a simplified static wheel model. A four-wheel kart needs a more complete suspension and chassis calculation.

The important rule is that obstacle climbability should depend on:

- Wheel radius.
- Ground clearance.
- Suspension travel.
- Wheel torque.
- Available traction.
- Vehicle speed.
- Collision shape.

Don't make a 1-unit vertical crate climbable just because its height is small relative to the kart.

## C. Obstacle categories and automatic treatment

| Category           | Physical behaviour | Default treatment       |
| ------------------ | ------------------ | ----------------------- |
| Small rounded curb | Conditional        | Test wheel clearance    |
| Smooth ramp        | Driveable          | Surface collider        |
| Quarter pipe       | Driveable          | Curved surface collider |
| Low mound          | Driveable          | Smooth terrain          |
| Large crate        | Solid              | Block                   |
| Tall rock          | Solid              | Block                   |
| Tree trunk         | Solid              | Block                   |
| Decorative grass   | Non-solid          | No collider             |
| Bridge             | Driveable          | Surface collider        |
| Fence              | Solid              | Block                   |
| Lava               | Hazard             | Eliminate               |
| Water              | Hazard             | Eliminate               |
| Low platform edge  | Solid or drop      | Context-dependent       |

Mandatory: A visual mesh must never accidentally determine climbability simply because its triangle collider happens to be sloped.

Build intentional collision geometry separately.

# 5. Mathematical design of every curve

Your maps should not be constructed from rectangular road segments joined at sharp angles.

You need continuous curves.

## A. Circular curves

A circular arc is:

\\[ x(\phi)=x_c+R\cos(\phi) \\]

\\[ z(\phi)=z_c+R\sin(\phi) \\]

Where:

- \\(R\\) = curve radius.
- \\((x_c,z_c)\\) = centre.
- \\(\phi\\) = angle.

Curvature:

\\[ \kappa=\frac{1}{R} \\]

A smaller radius means a sharper turn.

### Yaply curve standards

| Curve type | Radius      | Driving behaviour     |
| ---------- | ----------- | --------------------- |
| Very wide  | 16–22 units | High-speed driving    |
| Wide       | 12–16 units | Comfortable turning   |
| Medium     | 8–12 units  | Combat manoeuvring    |
| Tight      | 5–8 units   | Slow corner           |
| Hairpin    | 4–5 units   | Special sections only |

These should be adjusted for the actual kart turning radius.

## B. Smooth transitions between straight roads and curves

One problem with simple circular curves is that the curvature changes instantly from zero to \\(1/R\\).

That can create unnatural steering transitions.

Use a clothoid transition:

\\[ \kappa(s)=\frac{s}{A^2} \\]

Where:

- \\(s\\) = distance along the transition.
- \\(A\\) = clothoid parameter.

For a transition of length \\(L\\) reaching a curve radius \\(R\\):

\\[ A=\sqrt{RL} \\]

This provides a gradual change in curvature.

For your game, use clothoids or cubic Bézier curves for road transitions.

## C. Cubic Bézier curves

A cubic Bézier curve:

\\[ B(t)=(1-t)^3P_0+ 3(1-t)^2tP_1+ 3(1-t)t^2P_2+ t^3P_3 \\]

Where:

\\[ 0\leq t\leq1 \\]

You define four control points:

- \\(P_0\\): starting position.
- \\(P_1\\): first tangent control.
- \\(P_2\\): second tangent control.
- \\(P_3\\): ending position.

This is particularly useful for:

- Curved roads.
- Ramp transitions.
- Hairpins.
- Track boundaries.
- Elevated bridges.

[Mountain Road Pack – Curvy Track System | Game Ready Environment | Fab](https://images.openai.com/static-rsc-4/Mnvd8nR0x27eEYrZnWHuee3K6kGzRI-w7ehK_n4P_V34-eF68MuO6MJ3yBBU5H54xQ02d1MOXOhlo7oRfNc5zxeITyz_lv7NghR2LSyON5K-i3nKK18yMKH5_xK0ZPCDa0vr06E7flU2x4eaDV_pjBp3v71Pdg1UNqNvVF58LSw?purpose=inline)

[fab.com](https://www.fab.com/listings/6137c9eb-1fcf-468c-a714-7ee7a6595935?utm_source=chatgpt.com)

## D. Road banking

When a kart takes a curve at speed, a banked surface can improve the driving experience.

The idealised banking angle is:

\\[ \tan(\beta)=\frac{v^2}{gR} \\]

Suppose:

- Speed = 12 m/s.
- Radius = 12 m.

Then:

\\[ \beta=\tan^{-1}\left(\frac{144}{9.81(12)}\right) \\]

\\[ \beta\approx50.8^\circ \\]

That's a theoretical idealised banking angle, not a sensible universal design target for an arcade kart.

For Yaply, start with:

- 0° for ordinary roads.
- 3–8° for gentle banking.
- 8–15° for noticeable banking.
- 15–25° for special stunt tracks.

You can allow tyre grip and arcade steering to handle the rest.

# 6. Vertical depth, elevation and ramp transitions

This is the next major area I would rebuild.

Your maps need more than flat ground with blocks placed on top.

They need intentional vertical geometry.

[Modular Tracks - Racing Tracks | GameDev Market](https://images.openai.com/static-rsc-4/su7lT6dsuhT4Ll43R_N2aI0RmQiMwm3nQZkdFJ00ljGf5WkB9No1MYbKQjIxk5YcitfBp_acLV1htMh6J8q2abnXnT9Qo6C712kFalvjyVZgkL1xgJJ6jT6CUO3CmgAj01V_A1vF3Ko62GQsWz3LWoI8yO0-rOuoJ91NP7SX5C0?purpose=inline)

[Make Way -  Keymailer](https://images.openai.com/static-rsc-4/ApHsbGDSFZdWwqCfknLgWebV8spyE3uxHMv3HhWdQSWeqJ4M2qcsngq9wVSrFqqILT3K9ueFfgNgcgEgf8fyw_WyJsP5N0u4KmOfi--Sb8lFMBG6Te6waoKHkXfLfwfiSBIlFsGxrKgFHIrmieCB6oI_UeMVrIGqZ--foDufTLs?purpose=inline)

[Sleeping Dogs amongst February PlayStation Plus Content -Einfo Games](https://images.openai.com/static-rsc-4/giVuThixl_k1JSB6QIHwDi6A6B9LHBr8c8-2v-5ZqJ4YvyE30gnEOElQVytKNPROXX4JZXaANgN5tTQpx_G9NMZMAeH7Zg0lDQmrTrOcNd8WtZH48ezhhYzvQ4TgPFDBBPlMlZ9sA-yG8sQoZcZGZlQ5FGT37WYU9D83E4TAt5E?purpose=inline)

15

## A. Elevation layers

For a standard 100 × 100 arena:

| Level         | Height  | Purpose                     |
| ------------- | ------- | --------------------------- |
| Ground        | 0       | Main combat                 |
| Low platforms | 1.0–1.5 | Small elevation changes     |
| Mid-level     | 2–3     | Alternative route           |
| High-level    | 4–6     | Elevated combat             |
| Special tower | 7–10    | Visual landmark / objective |

Not every map needs every layer.

A simple arena should not become an unnecessarily complicated multilevel structure.

## B. Smooth vertical curves

Don't join a flat road to a ramp with an abrupt angular corner.

Use a vertical curve.

A cubic elevation profile can be:

\\[ y(t)= (1-t)^3y_0+ 3(1-t)^2ty_1+ 3(1-t)t^2y_2+ t^3y_3 \\]

This gives you a smooth transition between elevations.

You should also test the first and second derivatives at the transition points to avoid sudden slope and curvature changes.

## C. Ramp landing clearance

A ramp must have:

- Enough horizontal landing distance.
- No immediate vertical wall after landing.
- No pickup directly at an unavoidable landing collision.
- Enough room for the kart to turn.
- A continuous collision surface.

For a jump, use projectile motion as an initial estimate:

\\[ y(t)=y_0+v_0\sin(\theta)t-\frac12gt^2 \\]

\\[ x(t)=v_0\cos(\theta)t \\]

For equal launch and landing heights:

\\[ R\_{jump}=\frac{v_0^2\sin(2\theta)}{g} \\]

But actual kart jumps need suspension, air control and collision handling. Don't use the ballistic equation as the entire physics controller.

## D. Quarter pipes

A quarter pipe should be curved, not a flat rectangular ramp.

One possible profile is:

\\[ x(\theta)=R\sin(\theta) \\]

\\[ y(\theta)=R(1-\cos(\theta)) \\]

for:

\\[ 0\leq\theta\leq\frac{\pi}{2} \\]

This gives a smooth quarter-circle transition.

Use it in:

- Skate Park.
- Cyberpunk stunt arenas.
- Special stunt sections of Smash Fort-inspired arenas.

# 7. Complete kart physics model

I would also stop treating movement as simple position changes.

Your kart needs a coherent arcade vehicle model.

## A. Longitudinal acceleration

\\[ m\frac{dv}{dt} = F\_{drive}-F\_{drag}-F\_{rolling}-mg\sin(\theta) \\]

Aerodynamic drag:

\\[ F\_{drag}=\frac12\rho C_dAv^2 \\]

Rolling resistance:

\\[ F\_{rolling}=C\_{rr}mg\cos(\theta) \\]

Where:

- \\(\rho\\) = air density.
- \\(C_d\\) = drag coefficient.
- \\(A\\) = frontal area.
- \\(C\_{rr}\\) = rolling resistance coefficient.

For arcade gameplay, you can simplify these terms, but keep the model consistent.

## B. Wheel torque

The force at the wheels is:

\\[ F\_{drive}=\frac{\tau\_{wheel}}{r\_{wheel}} \\]

If the engine torque is too high, the kart may accelerate up surfaces that should be difficult.

Clamp the available force based on traction:

\\[ F\_{actual}= \min(F\_{drive},\mu N) \\]

## C. Steering

A simplified bicycle model:

\\[ \dot{\theta}=\frac{v}{L}\tan(\delta) \\]

Where:

- \\(L\\) = wheelbase.
- \\(v\\) = forward velocity.
- \\(\delta\\) = steering angle.

For arcade handling, add:

- Speed-dependent steering.
- Reverse steering behaviour.
- Lateral grip.
- Drift mode.
- Traction recovery.
- Airborne steering.
- Surface-specific grip.

## D. Lateral grip and drifting

The lateral force is:

\\[ F_y=ma_y \\]

For a simplified steady-state turn:

\\[ a_y=\frac{v^2}{R} \\]

The available lateral grip is limited by:

\\[ |F_y|\leq\mu N \\]

When the required lateral force exceeds the available grip, the kart begins sliding.

This is a useful foundation for drift behaviour.

A practical arcade drift controller should introduce a controllable rear slip angle rather than simply rotating the kart model independently of its movement direction.

## E. Fixed timestep

Use a fixed physics timestep:

\\[ \Delta t=\frac1{60} \\]

Physics should run at 60 Hz even if rendering drops below 60 FPS.

A simplified update:

```
const FIXED_DT = 1 / 60;

let accumulator = 0;

function updateFrame(frameDt) {
  accumulator += Math.min(frameDt, 0.1);

  while (accumulator >= FIXED_DT) {
    updateKartPhysics(FIXED_DT);
    updateCollision(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  renderGame();
}
```

Don't run your collision system once per rendered frame with arbitrary time steps.

# 8. Map-by-map redesign blueprint

Now let's translate the mathematics into actual arena designs.

I recommend building the following original Yaply arenas.

All dimensions and route descriptions below are proposed Yaply designs. They are not original Smash Karts coordinates or exact replicas.

## Classic collection

[Mantis Burn Racing® on Steam](https://images.openai.com/static-rsc-4/yisq2axKKSd28s60wlL5nXyl7flRV9NInKwEojEvpfXouBN8TxbMdnCwOivTSM2g-B_2P57MYWUWKLHDCASLI2ZbH1DljZUXDqWnh_013MkDZ30p1RSqJt6Inl7_vak8Te-C-Yidq19Tw7jBpSSnCt-QxGHv5GDGo-VETVsld7w?purpose=inline)

01\. Quarry Clash

Open combat

- 100 × 100 units.
- Three broad routes.
- Central open combat zone.
- Small rock formations, not rock walls everywhere.
- Two intentional ramps.
- 7–9 weapon pickups.

[Pre-Alpha Screenshots image - BEARZERKERS - ModDB](https://images.openai.com/static-rsc-4/R1KxPjeSjPmf2kwnmnI-OxP-OZHly7tCfTe98SaqAo903L1GDgPRdYqUHCwTlwsU39vkrY6gN1X6-sVhSs0SDYT7svuO_Uj4lt1OmmTRi8tnbFau0Ru_sGu8XqtLdDSM0e_tqBjaM4mkpJzKRs1KORBfmDU2M2ZL5PYF1C9NuaE?purpose=inline)

02\. Hollow Graveyard

Environmental combat

- 100 × 100.
- Tombstones distributed in small groups.
- Central open path.
- Curved perimeter road.
- One bridge over a hazardous stream.
- Tombstones must have small, deliberate collision footprints.

[About | Tesana](https://images.openai.com/static-rsc-4/6gsm5o1M0qkUq-w9Gjnxm5wSpTGDR6o52jHhqE3qdAxiRM6LBniJYj_2hntNhzupwq_1L78QOP5Tp7XjGMEbGecpJP8xarhOK638bP9sQTB9sjUK2YqN6zXV5bk9beAT6Lk3vSeP_4NEl29rHJCfTQpl1bsXw0gB4pWfBVskmHs?purpose=inline)

03\. Ironkeep Fort

Multi-level

- 100 × 100.
- Central castle.
- Outer road.
- Two connected ramp systems.
- Elevated rear garden.
- A hidden passage with two exits.

[\[Análisis\] Beach Buggy Racing - Nintenderos](https://images.openai.com/static-rsc-4/bCmR6O_N_f8zgz8xQE_1e9qcYPlBdzJ41-6RQSCEgeYNKLi6_keQX0RdGxckwIlmG-AbpeWTPV9v4ykh_IHcWoJOCW_o0JdaDqKmRjbTlx70_6smYS__WiGe0c2K2V-GOylLhTUAa25eCCZ0mRT_0l4tWfmhv9OACU0IkAah5Hw?purpose=inline)

04\. Magma Crossing

Hazard map

- 110 × 110.
- Lava channels.
- Three connected safe islands.
- Bridges with wide entry and exit sections.
- One optional elevated route.
- No unavoidable spawn near lava.

[Building Rocket Racing Islands in Unreal Editor for Fortnite | Fortnite Documentation | Epic Developer Community](https://images.openai.com/static-rsc-4/78iNKzLeun5Y7qwpBvPSWxYG1KUnGpGP9QsTj3eHfIJNsQAN_6sGr1kSJhaD57hL2okgETZ7BA9QwC9T3u7E_tcnokje_u-Az70QUnLHMuYB_w5_XJ5qugSVpq14L_bYAnn7SbxJS1MDb4LZ1h7ugrK_BeeHu-eLR1Vk26f3FhY?purpose=inline)

05\. Drift Island

Compact

- 80 × 80.
- Symmetrical layout.
- Central hazard.
- Four open corner zones.
- Curved perimeter routes.
- Designed for fast combat.

[skate park battle arena - Download Free 3D model by amogusstrikesback2 \[7ef68d6\] - Sketchfab](https://images.openai.com/static-rsc-4/koxiEkPC0z85KDgXKIInpxdA4sBoNybe_j1XwGqRiDKIq-2_Gu0XLKsWotpy0Su_7SiETP_TP6c7Nn7dE_satKJb2Af0G2Jhq5OB_2ixILltwgitzEI2w33acHp-P50HCIWoqdNwU0eKeaunaOuMcaaZbOnRpuUSzFP691xtChk?purpose=inline)

06\. Velocity Park

Stunt driving

- 100 × 100.
- Large central bowl.
- Quarter pipes.
- Smooth transitions.
- Elevated crossing.
- Open landing areas.

[Borealis by epic - Fortnite Creative Map Code - Fortnite.GG](https://images.openai.com/static-rsc-4/6I2clTM7XYeVlRhM6or76whOTC3_uTrdf35shdtt-O0-ozgV1ar0FhAGSlSvCz-jkALjgphFiQXLH75LUs3_zTtoy3aCAdnx8cLvAoy01yidjWGcXJ3INtrg7zVrenNgV3TVEAv2hPYMK9sLFdbrU-eliNEyLk8IrbSxBWkXWkI?purpose=inline)

07\. Frost Circuit

Winter terrain

- 110 × 110.
- Wide snowy driving surface.
- Ice sections with reduced grip.
- Snow mounds with smooth transitions.
- Two alternate routes.
- Limited decorative trees.

[Cosmic Royale \[PC\] - Gamernews.it](https://images.openai.com/static-rsc-4/jXwavhkgm0KavqW-e0pM0T_4YY6zXYQXQmgyxQJxgPoSwUPNAJA0x-2Rgq3i_DuHeKAQ49NPN9k9DflFEGnAYv304SQte2n1mco1NRQ3V9Wxm7QEoxzBQzk6a6Bp3_1Fb_whjl7Yq2yd_SdXNmxZSk2E7ik5Blek8qLQVAtb03Y?purpose=inline)

08\. Orbital Arena

Sci-fi

- 100 × 100.
- Central combat platform.
- Outer ring.
- Two elevated bridges.
- Controlled fall hazards.
- No disconnected platforms without intentional jump mechanics.

[Ultra-realistic 3d Go-kart Track Render • PromptDen](https://images.openai.com/static-rsc-4/1q2iwaXeyzpEV_RXZI7exumMJx46sn8HmemBrW9h5ChqtJJvg5DkiPTeUZDH5Y1q5bykdPecwsGO4kxf0sq1vOldxbi6wL-F-M09kXxGtsvtVues3ab56MLMW-TO7O-6yWl3enpkt_PRev_RfZ34VYmphrBB4G6VeTfSk_jbR8M?purpose=inline)

09\. Apex Speedway

Racing hybrid

- 100 × 150.
- Continuous circuit.
- Four major curves.
- Two overtaking sections.
- Wide combat straights.
- Central shortcut.

[Frostbite Circuit 1303-4313-3309 by pewrj2372 - Fortnite Creative Map Code - Fortnite.GG](https://images.openai.com/static-rsc-4/ptLQsdl20vIegH6SsD1ldljCX8TnDhZKJainUUeuDWJPuvU1m0lAcKJGeREZ77QMP-7QL0iQNkE1OdYJFwqIsw2BcBR5MRYWjEhItT-CdtJsu4eDF_JkvRl_qzM9jGfT-G98N4lMG8ExK7agj3Jz-qhkGxW4dy6_nyCTD3g1Buk?purpose=inline)

10\. Glacier Slide

Drift-focused

- 100 × 120.
- S-curves.
- Low-friction sections.
- Wide turning areas.
- No sharp invisible walls.
- Several optional shortcuts.

## Sky Arena collection

These should be designed as separate level identities, not variations of the same rectangular platform.

[Battlecore Arena | Free to Play | Ubisoft Connect, Steam, Epic Game Store](https://images.openai.com/static-rsc-4/j_ZuEiiOP524PmBrbLaljc7UzUTQDckBelART3lbT_Vie0x-xNqeBP-2usM4o8Wp16MWqMnLshLr7h7jWyLBhHi0m2snkfUIubB_iwvyjz2T5nn9BDF_vTyKKXJTm3p2ApuAKpLtlvU_bO0AdvWbUOl_wC1STLXcHGZnlrxE610?purpose=inline)

11\. Skyfall

90 × 90. Multiple connected platforms, guarded edges and controlled drops.

[Flipnic: Ultimate Pinball - Images & Screenshots | GameGrin](https://images.openai.com/static-rsc-4/JLV6pgx1YiJyQ4FBw8fX4AZTJTMLyESI-kGsCznMWWHg_QABt1gi6GKguGXCHnwhgl502YuSccwPy_BPfMCXbeb71jpbpFug58-lwP8rIvgzjZCyEfU7i_AMrwszNmv7Ww1cFwZZELU5rIhFkHEGnHZDaDyMrDx2NqZeryVhraU?purpose=inline)

12\. Pinball Core

100 × 100. Bumpers, angled surfaces and central combat.

[BattleCore Arena on Steam](https://images.openai.com/static-rsc-4/UN6mb7jWgYemmguNc9L0OTeCvgpW1Bb1KAnE4uqg1aSEciKyWnAlZcuOiaqkuViN3PUHtqZQwVT7JsRjol9hXjtdN-e4HKekCEY1o8NChxMaqBizkDF9yZY7PRjNGR5gVF8hoXX73gdP-yInXrfwWsj_TTl07-2LMhqpuI-VvVU?purpose=inline)

13\. Sky Showdown

110 × 110. Symmetrical bases and a central tower.

[Aetheral Echoes – Shattered Citadel Unreal Game Environment | Fab](https://images.openai.com/static-rsc-4/tWQZ18tve56J7le1TzbxCMVrjLLHpXNlbqyA9UWK2VL34VkaStlj9JkxxqIdk3mDSVf6bwcWfInLeZZhOoh9HZx_C2VX1xWyEPKjNnzTWBnDLV1MWF4kIybweF1vvyJ1U5iWpfu2ft7yvO0emV_3SFlrH-eSdHXlIVZKiN8n9YU?purpose=inline)

14\. Celestial Temples

120 × 120. Temple platforms and multiple connecting bridges.

[Everything you need to know about Prestige Skins – Trackmania – The ultimate track racing game](https://images.openai.com/static-rsc-4/P2-WWUfVyitADi_4Qrx7fKTAyM5a5cXZhzqkQ3NA-u_LFI8xfKuRGOS4xvqMDr8Q0LJ766IYmX4l-H2R43wC9a8LSRgw9O0V3qw83H3TJorPs2ltX-n3BYVzdVCGYtnWlMC_-hmsW05ZXD5xXQS5E2ixDJinrYYVGA1TwacheB8?purpose=inline)

15\. Sky Tunnels

100 × 120. Two parallel tunnels, crossing connections and open combat exits.

[Barrendale Mesa Tutorial (Spoilers ahead!)](https://images.openai.com/static-rsc-4/wpChw8YLOrm5o7pfz8sbhM0UsuSNjmI_VsCA8-P1wSO5bra2hX2JkwIRP9unNh_cnT4NeIcUnGLd5aDyLAjHmKSvSQ2S-ERyrHtttOixtfRgrzk4n_GLQ3mQHUkcnAIO-8NDsvfv1E5wMB-KDgCMB0YktUr65MKuv0b3TWTb9FM?purpose=inline)

16\. Cloudbreak

100 × 100. Moving platforms and elevated routes, if supported by the game physics.

## Cyberpunk collection

I would make this a completely new visual identity for Yaply, with its own physics and level-design personality.

[Neon Cyber-Track City Unreal Engine - FlippedNormals](https://images.openai.com/static-rsc-4/J9SSUKIYmxO96zAhNiV72ngsctTJcN9QbYAWgtfxGRxTG8_9k8By4N5Fy5s2wYW0JGcZ6dg7GYsyB0TFqZOXhG0FyI2O9t3z44ROYOWuP75bPzvjiWHKIgElseMC1zzaGv0xQ1vAXQnU7gtbZLey9TT5SFZ5sc25G7Jk7wFRGpI?purpose=inline)

[A Closer Look at Punk Runner, a Cyberpunk Flying Car Racing Game](https://images.openai.com/static-rsc-4/U4n5iY7Ok9At_jXNiOsCOkWKs5KrjvvGlEQQvKoYn2KEMBcF0U6GoTYmssN1wVFM2EBRgKIm6pVW0eEDGCBFROS13ZF7_Qvn7kXtadaLFug6K3iEGpyiqFJATIH8xo3gzt_kNbdZFtPhUhKXySoMUkS4DeFr6wBcQpLhGKENUr8?purpose=inline)

[Make movement increase framerate independent - Blueprint - Epic Developer Community Forums](https://images.openai.com/static-rsc-4/FjAvbflf5HbuaGlwvHe20YEgTUv4H-hBLuym46gP856nNmZxaEdbj_tMmGSEBIlY_T49ODvzMIyWZEf2NUSdCYP2rjDd_V7sBXB6HektZH4pxEcSnuk4kJ5_-hE43Vgw2AadbWN5DnmnEVLwcrkXl_JJX232aykzBg8xPMdv2aE?purpose=inline)

14

[Neon Cyber-Track City Unreal Engine - FlippedNormals](https://images.openai.com/static-rsc-4/CJ1kV_uFRTCivmrY0gKJm3I1IvEmzFJg7xfiu_jDKKtZDQW_LuASaFEKBAED_FmAAr8TF3DeiG1Fz4dIhvPLhjLkvoVvX7m9pF3nxM5DRDSsbFewPcvnH8pm-zmj8yMtPydMIbHrfBRay6g5f3b7ThmVlxSl1cDNbrikZw2lREQ?purpose=inline)

17\. Neon District

- 110 × 110.
- Rooftop driving arena.
- Wide neon roads.
- Three elevated routes.
- Building facades should not block the actual road.
- Controlled rooftop fall boundaries.

[NTE | Underground Circuit Guide | Neverness to Everness - GameWith](https://images.openai.com/static-rsc-4/YFUII0PDWkP4Q4g8lzR02U9fL4Yq_N13MCoQcvcA06oHhVcwk949ck87m0KGDYr3KQVh71GtPrA2E72LAWe2AYiUD-EOdRR2eDGn2VYh_ZRJ6pZMXG96N0RLWoMQvsWEiGPC4saHGxB59oaVzPi7YrPiODN-_vUarvgWVkIL0MU?purpose=inline)

18\. Circuit Underground

- 100 × 120.
- Underground tunnels.
- One main circular circuit.
- Two cross-connections.
- Wider intersections.
- Controlled lighting.

[Viper Squad PC Steam CD Key | G2PLAY.NET](https://images.openai.com/static-rsc-4/8_wwGQgG3ABarbNkxClQ-PmwPpDLCjozc2lgGRH9Dj-NO02zwtOIuxkzpmWCcM9p149pKFRi3v9sz5SBJ304fqA8cdG0tMhFqHgsrDY0gEUxd_42NIQkZzIv11X5P4qSNAZLbxe7gtsILRDXYeY61G-qcZkZg44ybpzDAb6WW8w?purpose=inline)

19\. Reactor Core

- 100 × 100.
- Large central reactor.
- Four approach routes.
- Moving hazard machinery.
- Elevated maintenance bridges.
- Clearly marked danger zones.

[Neon Velocity: Rival Rush - 3D Racing by Jabali AI](https://images.openai.com/static-rsc-4/z2sBl8lI7PbbFZyMMw9LQPUvN0nta2PCHUd5SB6Wv2PVPWR9ppijd0-4tOKPT_VwM3BrddbCU9npQbrvuUPpt8ttY8mm1dET5YLcBRoAyBll2IToPttQnshXjAcn9z2Nlp8DwU2ZHe5hIpYCbif8XooxCYzOixYv5i1RQwOq2HQ?purpose=inline)

20\. Hyperlane 2099

- 100 × 150.
- High-speed highway circuit.
- Long curves.
- Elevated junctions.
- Large collision-free landing areas.
- Neon road indicators.

[AI 成绩单：Google: Nano Banana Pro (Gemini 3 Pro Image Preview)「赛博朋克地下斗兽场」82 分 - XSCT Bench](https://images.openai.com/static-rsc-4/JGOFcXP9wsTWafBctPeJb6VGocm4BXXw5VE9LWLQwi4VixLdiR-YC7Ckwtu-QTG2LOAfk-bKOCYZ5pzA_INYgUMszptdLny3Epk_9aeVNmeGngqUFvYYS3CInE4PdTDayQd4Sn4mp1QqXahxUWruiCoDLEq2p4bGYpik56PIueQ?purpose=inline)

21\. Holo Arena

- 90 × 90.
- Symmetrical arena.
- Holographic structures.
- Low physical obstacle density.
- Central combat platform.
- Visually complex but physically simple.

[It’s Lights Out and Engines on with Midnight Muscle.](https://images.openai.com/static-rsc-4/ekLeC1Z51Y2SevFq2Fu4MOSQIYeRIZ7pOpa5mLe3uSZtJZcTonuwugDTMIjAv5VMtbrg0J4np-aik8BzJ61ZNajEgnVSPGi-Oh7e1Yu0qbfii4DXEcwBU92vhvLSWUiDaSHpu6TVv1xddlwjZD7LWYwHB25x6xYHUdnR3JO3p2g?purpose=inline)

22\. Chrome Port

- 110 × 110.
- Cargo containers in deliberate clusters.
- Broad outer road.
- Central crane structure.
- One elevated shortcut.
- Containers should be solid, not accidental ramps.

The cyberpunk maps should use emissive lighting, neon road markings, holographic decorations, rain effects and original environmental assets. However, the physical geometry must remain readable.

A neon wall should not become a physical obstacle merely because it has a visible mesh.

# 9. Weapon pickup placement – make it mathematically controlled

Instead of manually scattering boxes, create a spawn-point manager.

For each pickup location \\(p_i\\), define:

\\[ p_i=(x_i,y_i,z_i) \\]

A spawn point is valid only if:

1. It is on a driveable surface.
2. Its height is appropriate.
3. It has adequate clearance.
4. It is reachable.
5. It isn't too close to another active pickup.
6. It isn't inside a hazard.
7. It isn't directly inside a kart spawn region.

### Minimum spacing

For a standard arena, begin with:

\\[ d(p_i,p_j)\geq12 \\]

Where \\(d\\) is the horizontal distance.

### Spawn selection

Use weighted sampling.

\\[ P(i)=\frac{w_i}{\sum_jw_j} \\]

Where \\(w_i\\) is the spawn-point weight.

For example:

| Spawn zone       | Weight |
| ---------------- | ------ |
| Main combat area | 1.0    |
| Outer route      | 1.1    |
| Ramp landing     | 0.8    |
| Elevated route   | 0.9    |
| Quiet region     | 1.2    |

These are initial tuning weights.

The spawn manager should also consider player distribution. If everyone is on one side, it should not repeatedly put every new box on the opposite side.

### Pickup density

A useful starting formula is:

\\[ N=\operatorname{round} \left( N\_{ref}\sqrt{\frac{A}{A\_{ref}}} \sqrt{\frac{P}{P\_{ref}}} \right) \\]

Where:

- \\(A\\) = arena area.
- \\(P\\) = active player count.
- \\(N\_{ref}=8\\).
- \\(A\_{ref}=10,000\\).
- \\(P\_{ref}=8\\).

This scales more conservatively than making pickup count directly proportional to arena area and player count.

It is a Yaply balancing heuristic, not Smash Karts' algorithm.

# 10. Automatic removal and rebuilding of unsuitable map elements

This requirement is essential.

I would implement a Map Quality Gate that examines every map before it is accepted into the playable map catalogue.

It should not simply hide obstacles that look wrong. It should inspect their physical and gameplay properties.

### A. Every object must have a classification

Use metadata like:

```
{
  "id": "arena_rock_014",
  "category": "obstacle",
  "collisionType": "solid",
  "climbable": false,
  "driveable": false,
  "decorative": false,
  "footprint": {
    "width": 2.5,
    "depth": 2.0,
    "height": 1.8
  },
  "physics": {
    "friction": 0.65,
    "restitution": 0.05
  }
}
```

For a ramp:

```
{
  "id": "arena_ramp_003",
  "category": "ramp",
  "collisionType": "driveable",
  "climbable": true,
  "driveable": true,
  "angleDegrees": 20,
  "height": 2,
  "horizontalLength": 5.49
}
```

These are example records.

### B. The automatic audit

Map Quality Gate

1. Geometry inspection

   Read every mesh, bounding box, material and transform.
2. Collision inspection

   Find oversized, duplicated, incorrect and invisible collision meshes.
3. Climbability inspection

   Check slopes, wheel clearance, traction and intended obstacle type.
4. Driveability inspection

   Calculate route connectivity, minimum widths and turning clearance.
5. Pickup inspection

   Verify all spawn points are reachable and valid.
6. Performance inspection

   Check draw calls, polygon count, texture memory and collider count.
7. Automatic remediation

   Remove or replace invalid objects from the active map configuration.
8. Final simulation

   Run kart navigation tests and generate a quality report.

### C. Rules for removing objects

| Failure                       | Action                          |
| ----------------------------- | ------------------------------- |
| Decorative object blocks road | Remove its collider             |
| Oversized flat obstacle       | Rebuild or remove               |
| Unintended climbable wall     | Replace collision mesh          |
| Ramp too steep                | Recalculate and rebuild         |
| Ramp with no landing area     | Rebuild                         |
| Object blocks all routes      | Relocate or remove              |
| Pickup inside geometry        | Move to valid spawn             |
| Duplicate obstacle            | Remove duplicate                |
| Disconnected platform         | Connect or remove               |
| Invisible collision wall      | Remove                          |
| Unnecessary decoration        | Reduce or remove                |
| Broken collision surface      | Rebuild from validated geometry |

Important safety requirement: Do not permanently delete original source assets during the first audit. Remove invalid instances from active map scenes, create backups, and only delete unused source assets after confirming that no map, prefab or code path references them.

This gives you the clean maps you want without destroying reusable project assets.

# 11. Automatic map validation and acceptance criteria

I would make it impossible for an unverified map to enter the multiplayer map rotation.

Create three quality states:

PASS

Ready for multiplayer

REVIEW

Requires adjustments

REJECT

Cannot be published

### Proposed validation thresholds

| Test                              | Pass requirement |
| --------------------------------- | ---------------- |
| Main driving routes               | At least 3       |
| Main route width                  | At least 8 units |
| Secondary route width             | At least 5 units |
| Pickup accessibility              | 100%             |
| Unintended collision objects      | 0                |
| Invisible blocking colliders      | 0                |
| Invalid ramp transitions          | 0                |
| Unintended disconnected platforms | 0                |
| Spawn points inside obstacles     | 0                |
| Critical stuck locations          | 0                |
| Local obstacle density            | Normally ≤25%    |
| Unintentional dead ends           | 0                |

For route width, use the kart's collision footprint plus clearance, not merely the distance between visual road edges.

### Automatic kart navigation tests

A particularly useful improvement would be to create an automated kart that tests the map.

It should:

1. Spawn at every spawn point.
2. Navigate to every major region.
3. Attempt every ramp.
4. Traverse every main route in both directions.
5. Attempt all pickup positions.
6. Test turning around obstacles.
7. Test landing after jumps.
8. Detect positions where velocity becomes zero while throttle is applied.
9. Detect repeated collision loops.
10. Generate a map accessibility report.

For route planning, use A\* or another graph-based pathfinding algorithm over the drivable navigation graph.

For turning tests, don't use a point-sized agent. Use the actual kart collision footprint or a conservative inflated footprint.

# 12. Free-only development requirements

You explicitly want this to remain at ₹0.

That means no paid map APIs, no commercial asset subscriptions, no paid physics services and no new paid infrastructure.

₹0 target

Recommended development stack

[12 best Software for 3D Modeling - Graphics Drawing Tablets Tests](https://images.openai.com/static-rsc-4/VS2kmHs6o3_uJ9JXaczfqcmSIIeNbYXjI6Ku5f81Ps_5T3hsfsxFs6kS9WR_PoQBQxRy06-fFBLXT7-9tYti0bagD0ZT9vmyJskeTcvsl95MLwaw_iW-Ww8JdtcJCVeaHRJo3GwD2Il2p5Ip8zCfZo5EPvTJ-l18fZliWDNS24Q?purpose=inline)

Blender

Free 3D modeling, geometry and collision mesh creation.

[Official website](https://www.blender.org/?utm_source=chatgpt.com)

[File:Three.js Icon.svg - Wikimedia Commons](https://images.openai.com/static-rsc-4/3IQ7cPoSs10rkMSCB3er-YlNWWbl3LzvXfkGX6c4ZDarZ335jEMbAON39Hnr6x0vW-6VZHQ_esvzvDjcDI8f17iipgDSluY3-EeahXYnSydnVv3gF4f8Z-ZVDvqF0mq1qafNP1eljVkuJVYGxiBXSqCqfCH803tHVG8ChnIW57M?purpose=inline)

Three.js

Open-source browser 3D rendering, if already used by the game.

[Official website](https://threejs.org/?utm_source=chatgpt.com)

[GitHub - dimforge/rapier: 2D and 3D physics engines focused on performance.](https://images.openai.com/static-rsc-4/kYmM66cWBn4OpPCy6K1gAx6uJNJ0d0Hg6aRepxumYyffKFXhGDpxaz66bOWi8S3Gmm7poAxd441AMtBovJ5xxgEBAQzv507Tibi-rV_CMIROQ1PgAArFl9sk3IgQV5oc-OSmbXwBtImhPHJ7lbnnIv8_Et9iY5TOcxGEv4eMaz8?purpose=inline)

Rapier

Free open-source physics engine option, if compatible with the existing implementation.

[Official website](https://rapier.rs/?utm_source=chatgpt.com)

[Kenney - Dutch Game Industry Directory](https://images.openai.com/static-rsc-4/syIjB5C3pRZlTTDOfUM9tkNAKsYPzea_6W33MczpyOxZhvRnAyCwkw89-OhkrT4wx1StNj4Jzm4YkcDttSUGpczBm5rGZHH0JL5jDtjn16bXhcghLxQ2z3KWjzytL4sui_tFZzzZcTGMzQtQ8ifiOH6cSbWnVbbtawsvc5D2r-k?purpose=inline)

Kenney Assets

Free assets; verify individual asset licences.

[Asset library](https://kenney.nl/assets?utm_source=chatgpt.com)

[Tải mẫu logo Cloudflare file vector AI, EPS, JPEG, SVG, PNG](https://images.openai.com/static-rsc-4/g54Zt-OvWXgtnfomi1yQ5xvnwkrkJxpz1J7KOQDO-zNOJhwYkjQQ9S9gtHctX4B0ro15qZ6RaJsFsqQmq2EzBgJTKNMrRdMfQ-u2rnD2QDnetLyk3Li5XlDoscldIbRsI-kWu6zgCVf86d-JCZw1PeOKID9HDhm8l7LL4Fl6q3s?purpose=inline)

Cloudflare Workers

Retain your existing free-tier multiplayer infrastructure, subject to its quotas.

[Pricing and free limits](https://developers.cloudflare.com/workers/platform/pricing/?utm_source=chatgpt.com)

Don't migrate physics engines just because another library exists. First inspect the current kart controller, renderer and collision system. A complete replacement could break your existing multiplayer implementation.

For your existing architecture:

- Keep the current Vercel deployment.
- Keep the existing Cloudflare Worker and Durable Objects.
- Keep the existing game communication protocol where possible.
- Generate original map geometry locally.
- Use free, properly licensed textures and models.
- Avoid external paid runtime dependencies.

Free-tier quotas still apply. A 3D map overhaul does not require a paid server, but increased multiplayer simulation and asset delivery must remain within the services' limits.
