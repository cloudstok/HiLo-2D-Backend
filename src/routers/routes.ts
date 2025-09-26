import { Router, Request, Response } from 'express';

const routes = Router();

routes.get('/', async (req: Request, res: Response) => {
  res.send({ status: true, msg: 'high low 2d Game Testing Successfully 👍' });
});

export { routes };
