import { z } from "zod";
import { destinationService } from "../services/destination.service.js";
const createSchema = z.object({
    name: z.string().trim().min(1).max(120),
    country: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).nullish(),
});
const updateSchema = createSchema.partial();
const idSchema = z.object({ id: z.string().uuid() });
// Express 4 ne gère pas les erreurs des handlers async : on les transmet à next()
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
export const destinationController = {
    list: wrap(async (_req, res) => {
        res.json(await destinationService.list());
    }),
    get: wrap(async (req, res) => {
        const { id } = idSchema.parse(req.params);
        res.json(await destinationService.get(id));
    }),
    create: wrap(async (req, res) => {
        const data = createSchema.parse(req.body);
        res.status(201).json(await destinationService.create(data));
    }),
    update: wrap(async (req, res) => {
        const { id } = idSchema.parse(req.params);
        const data = updateSchema.parse(req.body);
        res.json(await destinationService.update(id, data));
    }),
    remove: wrap(async (req, res) => {
        const { id } = idSchema.parse(req.params);
        await destinationService.remove(id);
        res.status(204).send();
    }),
};
