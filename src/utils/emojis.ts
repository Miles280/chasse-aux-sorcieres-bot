export const emojis = {
	gems: `<:gems:${process.env.EMOJI_GEMS_ID}>`,
	rubies: `<:rubies:${process.env.EMOJI_RUBIES_ID}>`,
	check: `<:check:${process.env.EMOJI_CHECK_ID}>`,
	uncheck: `<:uncheck:${process.env.EMOJI_UNCHECK_ID}>`,
	yellowcheck: `<a:yellowcheck:${process.env.EMOJI_YELLOWCHECK_ID}>`,
	bluecheck: `<a:bluecheck:${process.env.EMOJI_BLUECHECK_ID}>`,
	greencheck: `<a:greencheck:${process.env.EMOJI_GREENCHECK_ID}>`,
	orangecheck: `<a:orangecheck:${process.env.EMOJI_ORANGECHECK_ID}>`,
	redcheck: `<a:redcheck:${process.env.EMOJI_REDCHECK_ID}>`,
	pinkcheck: `<a:pinkcheck:${process.env.EMOJI_PINKCHECK_ID}>`,
	purplecheck: `<a:purplecheck:${process.env.EMOJI_PURPLECHECK_ID}>`,
	crown: `<:crown:${process.env.EMOJI_CROWN_ID}>`,
	alive: `<:alive:${process.env.EMOJI_ALIVE_ID}>`,
	dead: `<:dead:${process.env.EMOJI_DEAD_ID}>`,
	opened_door: `<:opened_door:${process.env.EMOJI_OPENEDDOOR_ID}>`,
	closed_door: `<:closed_door:${process.env.EMOJI_CLOSEDDOOR_ID}>`,
	villagers: `<:villagers:${process.env.EMOJI_VILLAGER_ID}>`,
	witch: `<:witch:${process.env.EMOJI_WITCH_ID}>`,
	independent: `<:independent:${process.env.EMOJI_INDEPENDENT_ID}>`
};

export const emojisV2 = {
	gems: { name: `gems`, id: `${process.env.EMOJI_GEMS_ID}` },
	rubies: { name: `rubies`, id: `${process.env.EMOJI_RUBIES_ID}` },
	alive: { name: `alive`, id: `${process.env.EMOJI_ALIVE_ID}` },
	dead: { name: `dead`, id: `${process.env.EMOJI_DEAD_ID}` }
};
