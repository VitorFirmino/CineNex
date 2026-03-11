import fs from 'fs';
import path from 'path';

const MAINTENANCE_FILE = path.join(process.cwd(), 'data', 'system', 'maintenance.json');

export function getMaintenanceState(): boolean {
  try {
    if (!fs.existsSync(MAINTENANCE_FILE)) return false;
    const data = fs.readFileSync(MAINTENANCE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return !!parsed.enabled;
  } catch (error) {
    console.error('Error reading maintenance state:', error);
    return false;
  }
}

export function setMaintenanceState(enabled: boolean) {
  try {
    const dir = path.dirname(MAINTENANCE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MAINTENANCE_FILE, JSON.stringify({ enabled, updatedAt: new Date().toISOString() }));
  } catch (error) {
    console.error('Error setting maintenance state:', error);
  }
}
