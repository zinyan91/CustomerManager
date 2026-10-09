import React from 'react';
import type { PresencePerson } from './collabApi';
import { initialsOf } from './initials';

const MAX_SHOWN = 4;

/** Người khác đang mở bảng tính: ảnh chữ cái, rê chuột xem tên và ô họ đang chọn. */
export const PresenceBar: React.FC<{ people: PresencePerson[]; unnamed: string; label: string }> = ({ people, unnamed, label }) => {
  if (people.length === 0) return null;
  const shown = people.slice(0, MAX_SHOWN);
  return (
    <div className="presence-bar" role="group" aria-label={`${label}: ${people.length}`}>
      {shown.map((person) => {
        const name = person.name || unnamed;
        return (
          <span key={person.userId} className="presence-avatar" title={person.cell ? `${name} · ${person.sheet}!${person.cell}` : name}>
            {initialsOf(person.name || unnamed)}
          </span>
        );
      })}
      {people.length > MAX_SHOWN && <span className="presence-avatar is-more">+{people.length - MAX_SHOWN}</span>}
    </div>
  );
};
