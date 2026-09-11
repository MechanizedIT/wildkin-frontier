# Overnight owner requests — September 11, 2026

This file preserves Chris's overnight instructions verbatim, in order. Operational notes and the current plan are in `OVERNIGHT_MANDATE.md` and `OVERNIGHT_DESIGN_PLAN.md`. These are current owner instructions; earlier historical scope must not override them. The live goal continues until Chris says stop.

## Initial overnight request

> Okay, so I am going to bed. I would like for you to act as CEO, producer, orchestrator using all of what we have learned developing this workflow to create game assets, continue to interate on it and develop the game from end to end, you should use goal mode and a similar workflow to the one described in dream-loop where you act as the orchestrator and use subagents, you should review the state of the game and the stated vision, come up with a solid plan to generate art assets for all the objects and characters in game including textures and animations, you should look heavily at the UI and how it can be refined and polished (maybe look into mobile game and web game ui and ux principles and try your best to make it more game like, less text more showing, more intuitive, simpler) and develop out the UI/UX, you should look into the world and level design (currently each zone is poorly laid out almost exactly the same, you should look into world and level design principles and make each level/zone unique with unique layout and creatures and harvestables and ruins and cliffs and elevation etc, I feel like the zones need to be much bigger than they are), you should look into polishing the wildkins AI mechanics, for attack and idle and wander and follow as currently a captured pet wildkin follows the player way to strictly like it is just tied to the player maybe look at palworld and other games that have pet mechanics to make it feel more natural the pet should have their own physics probably like the character. That was a lot of rambling, but basically your goal is to work all night, probably start by making a thorough list/plan of all these things to work on, work on them using the workflows we have developed and in a similar way to how dream-loop works with agents to review, agents to plan, etc and when you think you have finished with that plan, start again and review the game and refine a new plan and do it again, you should not stop until I say stop tomorrow, be sure to work effectively and efficiently as this is an unreleased game with no users so we are basically in pre alpha, we don't need unneccessary testing and do not overengineer everything as you are set on a very high reasoing (Astra Ultra), and make sure your subagents don't over enginer and over test everything. You should make note of this prompt somewhere that you should look at every so often to keep yourself on track, even if you need to put it in a document somewhere like agents.md or something that regularly reminds you of the full goal, end to end game development of this game, you should even look at the intended vision of the game and intuit game systems and how they would work in a polished/published game, use professional game design and engineering skills, use the 3d model gen workflow and refinement we have been working on her, use the dream-loop skill where applicable. Does that make sense, can I go to bed and wake up tomorrow with a thoroughly polished prototype to test?

## Alien world and harvestable readability

> remember that this is an alien world so things shouldn't look exactly like they do on earth but they should make sense, also make sure that harvestables are easily readable from non harvestable/dynamic objects in level/world

## Expandable base, crafting, free construction and varied taming

> also consider that I want the players base area to be expandable, I want crafting, I want building (not just the pre placed buildables most mobile games have, more like ark or palworld but more casual), also note that the way to tame wildkins right now is one way and it never changes and is not very well done, each wildkin should have their own game mechanic to tame, some should have danger, not just a ui, think ark and palworld and other taming games, think placeable traps, think weapons and tools designed for the task, etc.

## Research, tools and reference downloads

> above all remember you have computer use and access to the internet, if there is information out there, a skill, a free tool that would aid you, especially in regards to good game design and physics games etc, feel free to look them up, download tools, assets for reference, etc.

## Model and reasoning selection

> also, there may be agents/models/reasoning levels configured in codex configs or something (I'm not sure how it works), but feel free to use your judgement for most suited model and reasoning level for subagents work, your goal is to be a professional orchestrator and manager of this codex session and make decisions on my behalf and not be bound by configs, do your very best work and use what tools you need to do that

## Laptop stability

> one last thing before I go, try to be gentle with blender, I know sometimes I've tried things and it has stalled my whole computer, we don't want to crash the computer overnight or bog down the computer with millions of computations for some modifier or somthing. Also note that when using the local image to 3d gen tool to also try not to set it too high and crash the computer or something.

## Durable notes check

> okay, before I go to bed, do you have an overnight text or markdown file somewhere with all this prompts I've just been giving you and notes?

## Camera, streaming and distance — owner follow-up

> The camera is sort of top down or at least not able to see too far, we should be able to have fairly detailed levels and assets so long as we stream them in and out correctly, don't k ow if three.js has something for this, or we need to beef up our own streaming and culling systems, or if we also need to consider some distance fog as well, it is up to you

## Rigging tutorials and skill research — owner follow-up

> I don't know what all research you've done on rigging and animating game characters, I asked google for some tutorials to turn into skills for codex and this was its response, maybe consider tasking a subagent to research it to imptove our workflow here?

The supplied Google response recommends CGDive Rigify human/quadruped metarigs, Grant Abbitt game rigging and Royal Skies modular rigging; preparation/scale/neutral pose, metarig placement, automatic weights with cleanup and NLA action exporting. It proposes joint placement by mesh-volume centroids, which remains unverified third-party advice, not an owner-locked requirement. It explicitly warns that AI responses may contain mistakes.

Supplied source leads:
- https://www.youtube.com/watch?v=1khSuB6sER0
- https://cgdive.com/rig-anything-with-rigify-chapter-3-the-prebuilt-metarigs-human-and-quadruped/
- https://www.reddit.com/r/gamedev/comments/1ukaso4/best_blender_tutorials_that_show_creation_of/
- https://www.youtube.com/watch?v=BYe9QeYBp3o
- https://www.facebook.com/groups/3dartistsb/posts/7661216990582945/

Requested outcome: focused independent research that improves the project's rigging/animation workflow and skill, with actual verified Blender steps rather than blindly adopting the generated summary.
