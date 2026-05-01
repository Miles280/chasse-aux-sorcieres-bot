import { Alignment } from '../enums/Alignment';
import { Camp } from '../enums/Camp';

export interface RoleInterface {
	id: number;
	name: string;
	description: string;
	minPlayer: number;
	camp: Camp;
	goal?: string;
	notes?: string;
	powers: Power[];
	alignments: Alignment[];
	imageUrl?: string;
}

export interface Power {
	id: number;
	title: string;
	description: string;
	isDayPower: boolean;
	isPassive: boolean;
	usageLimit: number | null;
	position: number;
	leavingHouse: boolean;
}
