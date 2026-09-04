import type { Export, FrameSettings } from '../types';

export type LicenseFields = Pick<
  FrameSettings,
  'licenseName' | 'licenseUrl' | 'licenseText' | 'creator' | 'homepage' | 'sourceTitle' | 'source'
>;

/**
 * The one-line credit that goes into the definition's `meta.license.text`.
 * A text the settings already carry wins, otherwise it is composed from the
 * source, the creator and the license name.
 */
export function composeLicenseText(settings: LicenseFields): string {
  const licenseName = settings.licenseName.trim();
  const licenseUrl = settings.licenseUrl.trim();
  const licenseText = settings.licenseText.trim();

  const creatorName = settings.creator.trim();
  const creatorUrl = settings.homepage.trim();

  const sourceName = settings.sourceTitle.trim();
  const sourceUrl = settings.source.trim();

  if (licenseText) {
    return licenseText;
  }

  let title = sourceName ? `„${sourceName}”` : 'Design';
  const creator = `„${creatorName || 'Unknown'}”`;

  if (sourceUrl) {
    title += ` (${sourceUrl})`;
  }

  let result = '';

  if (licenseName !== 'MIT' && !creatorUrl.includes('www.dicebear.com') && sourceName) {
    result += 'Remix of ';
  }

  result += `${title} by ${creator}`;

  if (licenseName) {
    result += `, licensed under „${licenseName}”`;

    if (licenseUrl) {
      result += ` (${licenseUrl})`;
    }
  }

  return result;
}

export function getLicenseAsText(exportData: Export): string {
  return composeLicenseText(exportData.frame.settings);
}
